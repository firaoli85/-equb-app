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

// ── Signed-winner identity lock ───────────────────────────────────────────────
// Call this before any operation that changes WHO a WeekPayout belongs to or
// WHICH week it lives in: move, remove/delete, lucky-number change.
// Bookkeeping (status, method, notes) is always allowed regardless of signedAt.
// Returns an error string if the row is signed, null if the operation may proceed.
export async function assertNotSignedForIdentityChange(
  weekPayoutId: string
): Promise<string | null> {
  const row = await db.weekPayout.findUnique({
    where: { id: weekPayoutId },
    select: { signedAt: true },
  });
  if (!row) return null; // row doesn't exist — let the caller decide
  if (row.signedAt !== null) {
    return "This payout is signed by the member — it can't be moved or removed.";
  }
  return null;
}

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
): Promise<{ error?: string }> {
  const payout = await db.weekPayout.findUnique({
    where: { id: weekPayoutId },
    include: {
      week: { select: { weekNumber: true } },
      member: { select: { nameAmharic: true } },
    },
  });
  if (!payout) return {};

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
  return {};
}

// ── cleanupSourceWeek (internal) ─────────────────────────────────────────────
// Shared by removeWinner and moveWinner. Removes a number from a week's
// winner-tracking fields inside an open transaction: filters winnerNumbers,
// fixes the legacy winnerWheelNumber pointer, and resets payoutStatus to null
// if that was the last winner.

async function cleanupSourceWeek(
  tx: Prisma.TransactionClient,
  weekId: string,
  removedNumber: number,
  current: { winnerNumbers: number[]; winnerWheelNumber: number | null }
): Promise<void> {
  const remaining = current.winnerNumbers.filter((n) => n !== removedNumber);
  const newWinnerWheelNumber =
    current.winnerWheelNumber === removedNumber
      ? (remaining[0] ?? null)
      : current.winnerWheelNumber;

  await tx.week.update({
    where: { id: weekId },
    data: {
      winnerNumbers: remaining,
      winnerWheelNumber: newWinnerWheelNumber,
      ...(remaining.length === 0 ? { payoutStatus: null } : {}),
    },
  });
}

// ── removeWinner ──────────────────────────────────────────────────────────────
// Deletes a WeekPayout and scrubs the number from the week's winner tracking
// so it becomes drawable again. Blocked if signed OR already collected — only
// PENDING + unsigned payouts represent genuine draw mistakes worth undoing.

export async function removeWinner(
  weekPayoutId: string
): Promise<{ error?: string; ok?: boolean }> {
  const payout = await db.weekPayout.findUnique({
    where: { id: weekPayoutId },
    include: {
      week: {
        select: {
          id: true,
          weekNumber: true,
          winnerNumbers: true,
          winnerWheelNumber: true,
        },
      },
      member: { select: { nameAmharic: true } },
    },
  });
  if (!payout) return { error: "Payout record not found." };

  if (payout.signedAt !== null) {
    return { error: "This payout is signed by the member and can't be removed." };
  }
  if (payout.status === "COLLECTED") {
    return { error: "This payout is marked collected and can't be removed." };
  }

  const { number, weekId } = payout;

  await db.$transaction(async (tx) => {
    await tx.weekPayout.delete({ where: { id: weekPayoutId } });

    await cleanupSourceWeek(tx, weekId, number, payout.week);

    await tx.auditLog.create({
      data: {
        action: `Winner removed: Lucky #${number} from Week ${payout.week.weekNumber}`,
        entityType: "WeekPayout",
        entityId: weekPayoutId,
        before: {
          number,
          weekId,
          weekNumber: payout.week.weekNumber,
          memberId: payout.memberId,
          memberName: payout.member?.nameAmharic ?? null,
          status: payout.status,
          amount: payout.amount?.toString() ?? null,
        },
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/collection");
  return { ok: true };
}

// ── moveWinner ────────────────────────────────────────────────────────────────
// Relocates a WeekPayout to a different week: deletes from source, creates on
// target with identical number/member/wheelType/amount. The number stays in the
// global drawn set (now via the target week) so it can't be spun again.
// Blocked if signed OR already collected — same combined guard as removeWinner.

export async function moveWinner(
  weekPayoutId: string,
  targetWeekId: string
): Promise<{ error?: string; ok?: boolean }> {
  const payout = await db.weekPayout.findUnique({
    where: { id: weekPayoutId },
    include: {
      week: {
        select: {
          id: true,
          weekNumber: true,
          winnerNumbers: true,
          winnerWheelNumber: true,
        },
      },
      member: { select: { nameAmharic: true } },
    },
  });
  if (!payout) return { error: "Payout record not found." };

  if (payout.signedAt !== null) {
    return { error: "Signed payouts can't be moved." };
  }
  if (payout.status === "COLLECTED") {
    return { error: "Collected payouts can't be moved." };
  }

  const sourceWeekId = payout.weekId;

  if (targetWeekId === sourceWeekId) {
    return { error: "The target week is the same as the current week." };
  }

  const targetWeek = await db.week.findUnique({
    where: { id: targetWeekId },
    select: {
      id: true,
      weekNumber: true,
      winnerNumbers: true,
      winnerWheelNumber: true,
      payoutStatus: true,
    },
  });
  if (!targetWeek) return { error: "Target week not found." };

  const { number, memberId, wheelType, amount } = payout;

  // Catch the conflict that the DB unique constraint would also catch — cleaner error.
  if (targetWeek.winnerNumbers.includes(number)) {
    return {
      error: `Lucky #${number} is already a winner on Week ${targetWeek.weekNumber}.`,
    };
  }

  // Merge number into target's winnerNumbers (union, sorted)
  const targetNumbers = [...new Set([...targetWeek.winnerNumbers, number])].sort(
    (a, b) => a - b
  );

  await db.$transaction(async (tx) => {
    // 1. Delete from source and scrub source week's tracking fields
    await tx.weekPayout.delete({ where: { id: weekPayoutId } });
    await cleanupSourceWeek(tx, sourceWeekId, number, payout.week);

    // 2. Create on target — preserve original number/member/wheelType/amount;
    //    status resets to PENDING (row is fresh on a new week).
    await tx.weekPayout.create({
      data: {
        weekId: targetWeekId,
        number,
        memberId,
        wheelType,
        amount,
        status: "PENDING",
      },
    });

    // 3. Update target week's winner tracking fields
    await tx.week.update({
      where: { id: targetWeekId },
      data: {
        winnerNumbers: targetNumbers,
        ...(targetWeek.winnerWheelNumber === null ? { winnerWheelNumber: number } : {}),
        ...(targetWeek.payoutStatus === null ? { payoutStatus: "PENDING" } : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        action: `Winner moved: Lucky #${number} from Week ${payout.week.weekNumber} to Week ${targetWeek.weekNumber}`,
        entityType: "WeekPayout",
        entityId: weekPayoutId,
        before: {
          weekId: sourceWeekId,
          weekNumber: payout.week.weekNumber,
          number,
          memberId,
          memberName: payout.member?.nameAmharic ?? null,
          status: payout.status,
          amount: amount?.toString() ?? null,
        },
        after: {
          weekId: targetWeekId,
          weekNumber: targetWeek.weekNumber,
          number,
          status: "PENDING",
        },
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/collection");
  return { ok: true };
}
