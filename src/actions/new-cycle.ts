"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generateWeekDates } from "@/lib/equb";

// ─────────────────────────────────────────────────────────────────────────────
// wipeAllCycleData
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wipes ALL cycle data to zero. Destructive, irreversible.
 *
 * Cascade map (schema onDelete rules):
 *   member.deleteMany   → cascades: Payment, PaymentReviewRequest, MemberSession
 *                         WeekPayout.memberId is SET NULL (rows not deleted yet)
 *   week.deleteMany     → cascades: WeekPayout (memberId already null), Payment
 *                         (already gone), PaymentReviewRequest (already gone)
 *   auditLog            → no FK — deleted explicitly (step 1)
 *   wheelSlot           → no FK — deleted explicitly (step 4)
 *   wheelConfig         → no FK — deleted explicitly (step 5); every read site uses
 *                         `?.priorityNumbers ?? []` and savePriorityNumbers uses upsert,
 *                         so the singleton row is recreated on demand
 *   EqubArchive         → intentionally NOT touched (historical records preserved)
 *
 * All five deletes run inside one $transaction. Any DB error rolls back everything —
 * a half-wiped state cannot occur.
 *
 * This action wipes only — it does NOT seed weeks, members, payments, or wheel slots.
 * Seeding is handled by rebuildNewCycle below.
 */
export async function wipeAllCycleData(): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error ?? "Unauthorized" };

  try {
    await db.$transaction([
      // Step 1: audit log — no FK, must be explicit
      db.auditLog.deleteMany({}),

      // Step 2: members — FK cascades Payment, PaymentReviewRequest, MemberSession;
      //         WeekPayout.memberId → SetNull (these rows deleted in step 3)
      db.member.deleteMany({}),

      // Step 3: weeks — FK cascades WeekPayout, Payment (gone), PaymentReviewRequest (gone)
      db.week.deleteMany({}),

      // Step 4: wheel slots — no FK, must be explicit
      db.wheelSlot.deleteMany({}),

      // Step 5: wheel config — no FK, safe to delete; row recreated by upsert on next save
      db.wheelConfig.deleteMany({}),
    ]);

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Wipe failed — no data was deleted: ${msg}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// rebuildNewCycle
// ─────────────────────────────────────────────────────────────────────────────

export type RebuildMemberInput = {
  nameAmharic: string;
  nameEnglishFirst?: string;
  nameEnglishLast?: string;
  phone?: string | null;
  weeklyAmount: number;         // dollars — converted to cents inside
  wheelNumber: number;
  extraWheelNumber?: number | null;
};

export type RebuildInput = {
  newStartDate: string;         // YYYY-MM-DD
  members: RebuildMemberInput[];
};

/**
 * Seeds a fresh cycle after wipeAllCycleData() has already been called.
 *
 * Transaction steps (interactive — each step uses IDs from prior steps):
 *   1. 20 Week rows — dates from generateWeekDates(newStartDate), weekNumber 1–20
 *   2. For each member:
 *        Member row — pin=null (canonical "must set PIN" signal; no extra field needed)
 *        20 Payment rows — one per week, all PENDING
 *   3. WheelSlot rows — one per lucky number, positions in ascending-number order.
 *        Every wheelNumber and extraWheelNumber gets its own single-entry slot.
 *        The Wheel Setup page merges pairs/groups afterward.
 *   4. WheelConfig singleton upserted (id=1, priorityNumbers=[])
 *   5. AuditLog entry
 *
 * PIN design — pin=null:
 *   pin is String? (nullable) — no placeholder hash needed, no extra schema field.
 *   pin===null is the single canonical signal: member must set a PIN before accessing data.
 *   verifyMemberPin already returns { noPin: true } when pin===null.
 *   The /m/[token] gate and the login form both check pin===null to route to SetPinScreen.
 *
 * WheelSlot defaults — one number per slot:
 *   Example: member with wheelNumber=5, extraWheelNumber=13 → two slots: [5] and [13].
 *   Slot positions are assigned by sorting all lucky numbers ascending, so slot numbering
 *   is deterministic regardless of member order. The Wheel Setup page shows mismatches
 *   and lets the admin drag-merge the single slots back into paired groupings.
 */
export async function rebuildNewCycle(
  input: RebuildInput,
): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error ?? "Unauthorized" };

  // ── Validate inputs before touching the DB ───────────────────────────────

  const dateStr = input.newStartDate?.trim();
  if (!dateStr) return { error: "New start date is required." };
  const parsedDate = new Date(dateStr + "T00:00:00.000Z");
  if (isNaN(parsedDate.getTime()))
    return { error: "Invalid start date — use YYYY-MM-DD (e.g. 2026-07-01)." };

  const members = input.members ?? [];
  if (members.length === 0) return { error: "At least one member is required." };

  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const label = `Member ${i + 1} (${m.nameAmharic?.trim() || "unnamed"})`;

    if (!m.nameAmharic?.trim() || m.nameAmharic.trim().length < 2)
      return { error: `${label}: Amharic name is required (min 2 characters).` };

    if (typeof m.weeklyAmount !== "number" || isNaN(m.weeklyAmount) || m.weeklyAmount < 1)
      return { error: `${label}: weeklyAmount must be at least $1.` };

    if (!Number.isInteger(m.wheelNumber) || m.wheelNumber < 1)
      return { error: `${label}: wheelNumber must be a positive integer.` };

    if (m.extraWheelNumber != null) {
      if (!Number.isInteger(m.extraWheelNumber) || m.extraWheelNumber < 1)
        return { error: `${label}: extraWheelNumber must be a positive integer.` };
      if (m.extraWheelNumber === m.wheelNumber)
        return { error: `${label}: wheelNumber and extraWheelNumber must be different.` };
    }
  }

  // Cross-member uniqueness — build a combined pool; any number may appear only once
  const numberOwners = new Map<number, string>(); // number → "Member N (name) [role]"

  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const name = m.nameAmharic.trim();

    const claim = (n: number, role: "main" | "extra"): string | null => {
      if (numberOwners.has(n))
        return `Lucky #${n} is claimed by both ${numberOwners.get(n)} and Member ${i + 1} (${name}) as their ${role} number.`;
      numberOwners.set(n, `Member ${i + 1} (${name}) [${role}]`);
      return null;
    };

    const mainErr = claim(m.wheelNumber, "main");
    if (mainErr) return { error: mainErr };

    if (m.extraWheelNumber != null) {
      const extraErr = claim(m.extraWheelNumber, "extra");
      if (extraErr) return { error: extraErr };
    }
  }

  // ── Build one-per-number slot defaults ───────────────────────────────────
  // Sort all lucky numbers ascending → positions 1, 2, 3, …
  const allNumbers: number[] = [];
  for (const m of members) {
    allNumbers.push(m.wheelNumber);
    if (m.extraWheelNumber != null) allNumbers.push(m.extraWheelNumber);
  }
  allNumbers.sort((a, b) => a - b);
  const defaultSlots = allNumbers.map((n, i) => ({ position: i + 1, numbers: [n] }));

  // ── Transactional build ──────────────────────────────────────────────────

  try {
    await db.$transaction(async (tx) => {

      // Step 1: Weeks
      const weekDates = generateWeekDates(parsedDate);
      await tx.week.createMany({
        data: weekDates.map((date, idx) => ({ weekNumber: idx + 1, date })),
      });
      const freshWeeks = await tx.week.findMany({
        select: { id: true },
        orderBy: { weekNumber: "asc" },
      });

      // Step 2: Members + payments
      for (const m of members) {
        const member = await tx.member.create({
          data: {
            nameAmharic:      m.nameAmharic.trim(),
            nameEnglishFirst: m.nameEnglishFirst?.trim() ?? "",
            nameEnglishLast:  m.nameEnglishLast?.trim() ?? "",
            phone:            m.phone ?? null,
            weeklyAmount:     Math.round(m.weeklyAmount * 100),
            wheelNumber:      m.wheelNumber,
            extraWheelNumber: m.extraWheelNumber ?? null,
            pin:              null,   // pin=null is the canonical "must set PIN" signal
          },
          select: { id: true },
        });

        await tx.payment.createMany({
          data: freshWeeks.map((w) => ({
            memberId: member.id,
            weekId:   w.id,
            status:   "PENDING" as const,
          })),
        });
      }

      // Step 3: WheelSlots — one per lucky number
      await tx.wheelSlot.createMany({
        data: defaultSlots.map((s) => ({ position: s.position, numbers: s.numbers })),
      });

      // Step 4: WheelConfig singleton
      await tx.wheelConfig.upsert({
        where:  { id: 1 },
        update: { priorityNumbers: [] },
        create: { id: 1, priorityNumbers: [] },
      });

      // Step 5: Audit log
      await tx.auditLog.create({
        data: {
          action:     `New cycle — ${members.length} member${members.length !== 1 ? "s" : ""} imported, start ${dateStr}, ${defaultSlots.length} single-number slots seeded (merge via Wheel Setup)`,
          entityType: "System",
          entityId:   "new-cycle",
        },
      });
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Rebuild failed — no data was written: ${msg}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// resetAndRebuildCycle
// ─────────────────────────────────────────────────────────────────────────────

export type ResetResult =
  | { ok: true; members: { nameAmharic: string; token: string }[] }
  | { error: string };

/**
 * Atomically wipes the current cycle and rebuilds a fresh one in a single
 * db.$transaction. If any step fails, Prisma rolls back everything — the old
 * cycle remains fully intact. There is no intermediate empty-DB state.
 *
 * Returns { ok: true, members } with the new member tokens so the UI can
 * display re-sharable login links immediately after the reset.
 */
export async function resetAndRebuildCycle(
  input: RebuildInput,
): Promise<ResetResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error ?? "Unauthorized" };

  // ── Validate before touching the DB ─────────────────────────────────────

  const dateStr = input.newStartDate?.trim();
  if (!dateStr) return { error: "New start date is required." };
  const parsedDate = new Date(dateStr + "T00:00:00.000Z");
  if (isNaN(parsedDate.getTime()))
    return { error: "Invalid start date — use YYYY-MM-DD (e.g. 2026-07-01)." };

  const members = input.members ?? [];
  if (members.length === 0) return { error: "At least one member is required." };

  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const label = `Member ${i + 1} (${m.nameAmharic?.trim() || "unnamed"})`;

    if (!m.nameAmharic?.trim() || m.nameAmharic.trim().length < 2)
      return { error: `${label}: Amharic name is required (min 2 characters).` };

    if (typeof m.weeklyAmount !== "number" || isNaN(m.weeklyAmount) || m.weeklyAmount < 1)
      return { error: `${label}: weeklyAmount must be at least $1.` };

    if (!Number.isInteger(m.wheelNumber) || m.wheelNumber < 1)
      return { error: `${label}: wheelNumber must be a positive integer.` };

    if (m.extraWheelNumber != null) {
      if (!Number.isInteger(m.extraWheelNumber) || m.extraWheelNumber < 1)
        return { error: `${label}: extraWheelNumber must be a positive integer.` };
      if (m.extraWheelNumber === m.wheelNumber)
        return { error: `${label}: wheelNumber and extraWheelNumber must be different.` };
    }
  }

  const numberOwners = new Map<number, string>();
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const name = m.nameAmharic.trim();
    const claim = (n: number, role: "main" | "extra"): string | null => {
      if (numberOwners.has(n))
        return `Lucky #${n} is claimed by both ${numberOwners.get(n)} and Member ${i + 1} (${name}) [${role}].`;
      numberOwners.set(n, `Member ${i + 1} (${name}) [${role}]`);
      return null;
    };
    const mainErr = claim(m.wheelNumber, "main");
    if (mainErr) return { error: mainErr };
    if (m.extraWheelNumber != null) {
      const extraErr = claim(m.extraWheelNumber, "extra");
      if (extraErr) return { error: extraErr };
    }
  }

  // ── Build slot defaults ──────────────────────────────────────────────────

  const allNumbers: number[] = [];
  for (const m of members) {
    allNumbers.push(m.wheelNumber);
    if (m.extraWheelNumber != null) allNumbers.push(m.extraWheelNumber);
  }
  allNumbers.sort((a, b) => a - b);
  const defaultSlots = allNumbers.map((n, idx) => ({ position: idx + 1, numbers: [n] }));

  // ── Single atomic transaction: wipe then rebuild ─────────────────────────

  const newMembers: { nameAmharic: string; token: string }[] = [];

  try {
    await db.$transaction(async (tx) => {

      // Wipe — same order as wipeAllCycleData (cascade map unchanged)
      await tx.auditLog.deleteMany({});
      await tx.member.deleteMany({});     // cascades Payment, ReviewRequest, Session; WeekPayout → SetNull
      await tx.week.deleteMany({});       // cascades remaining WeekPayout
      await tx.wheelSlot.deleteMany({});
      await tx.wheelConfig.deleteMany({});

      // Rebuild: weeks
      const weekDates = generateWeekDates(parsedDate);
      await tx.week.createMany({
        data: weekDates.map((date, idx) => ({ weekNumber: idx + 1, date })),
      });
      const freshWeeks = await tx.week.findMany({
        select: { id: true },
        orderBy: { weekNumber: "asc" },
      });

      // Rebuild: members + payments
      for (const m of members) {
        const member = await tx.member.create({
          data: {
            nameAmharic:      m.nameAmharic.trim(),
            nameEnglishFirst: m.nameEnglishFirst?.trim() ?? "",
            nameEnglishLast:  m.nameEnglishLast?.trim() ?? "",
            phone:            m.phone ?? null,
            weeklyAmount:     Math.round(m.weeklyAmount * 100),
            wheelNumber:      m.wheelNumber,
            extraWheelNumber: m.extraWheelNumber ?? null,
            pin:              null,
          },
          select: { id: true, token: true },
        });
        await tx.payment.createMany({
          data: freshWeeks.map((w) => ({
            memberId: member.id,
            weekId:   w.id,
            status:   "PENDING" as const,
          })),
        });
        newMembers.push({ nameAmharic: m.nameAmharic.trim(), token: member.token });
      }

      // Rebuild: wheel slots
      await tx.wheelSlot.createMany({
        data: defaultSlots.map((s) => ({ position: s.position, numbers: s.numbers })),
      });

      // Rebuild: wheel config singleton
      await tx.wheelConfig.upsert({
        where:  { id: 1 },
        update: { priorityNumbers: [] },
        create: { id: 1, priorityNumbers: [] },
      });

      // First audit entry of the new cycle (written after wipe cleared the old log)
      await tx.auditLog.create({
        data: {
          action:     `Cycle reset — ${members.length} member${members.length !== 1 ? "s" : ""} imported, start ${dateStr}, ${defaultSlots.length} wheel slots seeded`,
          entityType: "System",
          entityId:   "cycle-reset",
        },
      });

    }, { timeout: 30_000 });

    return { ok: true, members: newMembers };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Reset failed — the current cycle was not modified: ${msg}` };
  }
}
