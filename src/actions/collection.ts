"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

  const drawnNumbers = new Set<number>(drawnWeeks.map((w) => w.winnerWheelNumber!));
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

export async function recordWheelWinner(
  weekId: string,
  wheelNumber: number
): Promise<{ error?: string }> {
  const week = await db.week.findUnique({ where: { id: weekId } });
  if (!week) return { error: "Week not found" };
  if (week.winnerWheelNumber !== null) return { error: "Week already has a winner" };

  await db.week.update({
    where: { id: weekId },
    data: { winnerWheelNumber: wheelNumber, payoutStatus: "PENDING" },
  });

  await db.auditLog.create({
    data: {
      action: `Lucky #${wheelNumber} drawn for Week ${week.weekNumber}`,
      entityType: "Week",
      entityId: weekId,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/collection");
  return {};
}

export async function updatePayoutRecord(
  weekId: string,
  data: {
    payoutStatus: "PENDING" | "COLLECTED";
    payoutMethod?: "CASH" | "ZELLE" | "BOTH" | null;
    payoutNotes?: string;
  }
): Promise<void> {
  const week = await db.week.findUnique({ where: { id: weekId } });
  if (!week || week.winnerWheelNumber === null) return;

  await db.week.update({
    where: { id: weekId },
    data: {
      payoutStatus: data.payoutStatus,
      payoutMethod: data.payoutMethod ?? null,
      payoutNotes: data.payoutNotes?.trim() || null,
    },
  });

  await db.auditLog.create({
    data: {
      action: `Week ${week.weekNumber} payout ${data.payoutStatus.toLowerCase()}${data.payoutMethod ? ` via ${data.payoutMethod}` : ""}`,
      entityType: "Week",
      entityId: weekId,
    },
  });

  revalidatePath("/admin/collection");
}
