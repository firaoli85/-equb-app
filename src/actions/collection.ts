"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
