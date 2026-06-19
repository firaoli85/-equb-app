"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma, PayoutMethod } from "@prisma/client";
import {
  mainWheelWeekly,
  extraWheelWeekly,
  calculateMemberGross,
  calculateMemberFee,
  calculateNetPayout,
} from "@/lib/equb";

// ── Shared internal helper ────────────────────────────────────────────────────
// Resolves a lucky number to the member who owns it and computes their net payout.
// Checks wheelNumber (MAIN) first, then extraWheelNumber (EXTRA).
// Returns matched=false if no member owns this number — caller handles the warning.

async function resolveWeekPayoutData(number: number): Promise<{
  memberId: string | null;
  wheelType: "MAIN" | "EXTRA";
  amount: Prisma.Decimal | null;
  matched: boolean;
}> {
  let member = await db.member.findFirst({ where: { wheelNumber: number } });
  let wheelType: "MAIN" | "EXTRA" = "MAIN";

  if (!member) {
    member = await db.member.findFirst({ where: { extraWheelNumber: number } });
    wheelType = "EXTRA";
  }

  if (!member) {
    return { memberId: null, wheelType: "MAIN", amount: null, matched: false };
  }

  const hasExtra = member.extraWheelNumber !== null;
  const weeklyAmt =
    wheelType === "EXTRA"
      ? extraWheelWeekly(member.weeklyAmount)
      : mainWheelWeekly(member.weeklyAmount, hasExtra);

  const netCents = calculateNetPayout(
    calculateMemberGross(weeklyAmt),
    calculateMemberFee(weeklyAmt)
  );

  return {
    memberId: member.id,
    wheelType,
    amount: new Prisma.Decimal(netCents / 100),
    matched: true,
  };
}

// ── pickWheelWinner ───────────────────────────────────────────────────────────

export async function pickWheelWinner(
  weekId: string
): Promise<{ error?: string; slotPosition?: number; numbers?: number[] }> {
  const week = await db.week.findUnique({ where: { id: weekId } });
  if (!week) return { error: "Week not found" };
  if (week.winnerWheelNumber !== null) return { error: "Week already has a winner" };

  const [slots, config, members, drawnWeeks] = await Promise.all([
    db.wheelSlot.findMany({ orderBy: { position: "asc" } }),
    db.wheelConfig.findUnique({ where: { id: 1 } }),
    db.member.findMany({ where: { isArchived: false } }),
    db.week.findMany({ where: { winnerWheelNumber: { not: null } } }),
  ]);

  const priorityNumbers: number[] = config?.priorityNumbers ?? [];

  const allNumbers = new Set<number>();
  for (const m of members) {
    allNumbers.add(m.wheelNumber);
    if (m.extraWheelNumber !== null) allNumbers.add(m.extraWheelNumber);
  }

  // winnerNumbers is the source of truth; fall back to winnerWheelNumber for legacy rows
  const drawnNumbers = new Set<number>(
    drawnWeeks.flatMap((w) =>
      w.winnerNumbers.length > 0
        ? w.winnerNumbers
        : w.winnerWheelNumber != null ? [w.winnerWheelNumber] : []
    )
  );
  const available = new Set<number>([...allNumbers].filter((n) => !drawnNumbers.has(n)));

  const eligibleSlots = slots.filter((s) => s.numbers.every((n) => available.has(n)));
  if (eligibleSlots.length === 0) return { error: "No eligible slots remaining" };

  const prioritySlots = eligibleSlots.filter((s) =>
    s.numbers.some((n) => priorityNumbers.includes(n))
  );
  const pool = prioritySlots.length > 0 ? prioritySlots : eligibleSlots;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  return { slotPosition: chosen.position, numbers: chosen.numbers };
}

// ── recordWheelWinner ─────────────────────────────────────────────────────────
// Records the winning slot for a week. Creates one WeekPayout row per number
// in the same transaction. Idempotent on (weekId, number).

export async function recordWheelWinner(
  weekId: string,
  numbers: number[]
): Promise<{ error?: string; warnings?: string[] }> {
  if (numbers.length === 0) return { error: "No numbers provided." };

  const week = await db.week.findUnique({ where: { id: weekId } });
  if (!week) return { error: "Week not found" };
  if (week.winnerWheelNumber !== null) return { error: "Week already has a winner" };

  // Resolve all numbers before the transaction (read-only member lookups)
  const resolved = await Promise.all(
    numbers.map(async (n) => ({ number: n, ...(await resolveWeekPayoutData(n)) }))
  );

  const warnings = resolved
    .filter((r) => !r.matched)
    .map((r) => `Lucky #${r.number}: no member found for this number`);

  await db.$transaction(async (tx) => {
    await tx.week.update({
      where: { id: weekId },
      data: {
        winnerWheelNumber: numbers[0],
        winnerNumbers: numbers,
        payoutStatus: "PENDING",
      },
    });

    for (const r of resolved) {
      await tx.weekPayout.upsert({
        where: { weekId_number: { weekId, number: r.number } },
        create: {
          weekId,
          number: r.number,
          memberId: r.memberId,
          wheelType: r.wheelType,
          amount: r.amount,
          status: "PENDING",
        },
        update: {}, // existing row: touch nothing (idempotent)
      });
    }

    await tx.auditLog.create({
      data: {
        action: `Lucky #${numbers.join(" & #")} drawn for Week ${week.weekNumber}`,
        entityType: "Week",
        entityId: weekId,
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/collection");

  return warnings.length > 0 ? { warnings } : {};
}

// ── addWinnerToWeek ───────────────────────────────────────────────────────────
// Adds independent winners to an existing week (catch-up draws) without
// overwriting already-recorded winners. Numbers already drawn anywhere are
// skipped individually — the rest are processed as a batch.

export async function addWinnerToWeek(
  weekId: string,
  numbers: number[]
): Promise<{
  error?: string;
  added: number[];
  skipped: { number: number; reason: string }[];
  warnings: string[];
}> {
  const empty = { added: [], skipped: [], warnings: [] };

  if (numbers.length === 0) return { error: "No numbers provided.", ...empty };

  const week = await db.week.findUnique({ where: { id: weekId } });
  if (!week) return { error: "Week not found", ...empty };

  // Build drawn set across ALL weeks (winnerNumbers as source of truth)
  const allWeeks = await db.week.findMany({
    select: { winnerNumbers: true, winnerWheelNumber: true },
  });
  const drawnNumbers = new Set<number>(
    allWeeks.flatMap((w) =>
      w.winnerNumbers.length > 0
        ? w.winnerNumbers
        : w.winnerWheelNumber != null ? [w.winnerWheelNumber] : []
    )
  );

  const toAdd: number[] = [];
  const skipped: { number: number; reason: string }[] = [];

  for (const n of numbers) {
    if (drawnNumbers.has(n)) {
      skipped.push({ number: n, reason: `#${n} is already drawn in another week` });
    } else {
      toAdd.push(n);
    }
  }

  if (toAdd.length === 0) return { ...empty, skipped };

  // Resolve all new numbers before the transaction
  const resolved = await Promise.all(
    toAdd.map(async (n) => ({ number: n, ...(await resolveWeekPayoutData(n)) }))
  );

  const warnings = resolved
    .filter((r) => !r.matched)
    .map((r) => `Lucky #${r.number}: no member found for this number`);

  // Merge new numbers into existing winnerNumbers (union, sorted)
  const mergedSet = new Set([...week.winnerNumbers, ...toAdd]);
  const mergedNumbers = [...mergedSet].sort((a, b) => a - b);

  await db.$transaction(async (tx) => {
    await tx.week.update({
      where: { id: weekId },
      data: {
        winnerNumbers: mergedNumbers,
        // Set winnerWheelNumber only if not yet set (compat field)
        ...(week.winnerWheelNumber === null ? { winnerWheelNumber: toAdd[0] } : {}),
        // Set payoutStatus to PENDING if not yet set
        ...(week.payoutStatus === null ? { payoutStatus: "PENDING" } : {}),
      },
    });

    for (const r of resolved) {
      await tx.weekPayout.upsert({
        where: { weekId_number: { weekId, number: r.number } },
        create: {
          weekId,
          number: r.number,
          memberId: r.memberId,
          wheelType: r.wheelType,
          amount: r.amount,
          status: "PENDING",
        },
        update: {}, // existing row: touch nothing (idempotent)
      });
    }

    await tx.auditLog.create({
      data: {
        action: `Added winner(s) #${toAdd.join(" & #")} to Week ${week.weekNumber} (catch-up)`,
        entityType: "Week",
        entityId: weekId,
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/collection");

  return { added: toAdd, skipped, warnings };
}

// ── updatePayoutRecord ────────────────────────────────────────────────────────
// Writes to a specific WeekPayout row. Week.payoutStatus/payoutMethod left intact
// as deprecated fallback fields — removed in a later cleanup step.

export async function updatePayoutRecord(
  weekPayoutId: string,
  data: {
    status: "PENDING" | "COLLECTED";
    method?: PayoutMethod | null;
    notes?: string;
  }
): Promise<void> {
  const payout = await db.weekPayout.findUnique({
    where: { id: weekPayoutId },
    include: {
      week: { select: { weekNumber: true } },
      member: { select: { nameAmharic: true } },
    },
  });
  if (!payout) return;

  await db.weekPayout.update({
    where: { id: weekPayoutId },
    data: {
      status: data.status,
      method: data.method ?? null,
      notes: data.notes?.trim() || null,
      collectedAt: data.status === "COLLECTED" ? new Date() : null,
    },
  });

  const memberLabel = payout.member?.nameAmharic ?? `#${payout.number}`;
  await db.auditLog.create({
    data: {
      action: `Week ${payout.week.weekNumber} — Lucky #${payout.number} (${memberLabel}) payout ${data.status.toLowerCase()}${data.method ? ` via ${data.method}` : ""}`,
      entityType: "WeekPayout",
      entityId: weekPayoutId,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/collection");
}
