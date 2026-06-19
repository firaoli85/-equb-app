"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export async function toggleSkipWeek(weekId: string): Promise<void> {
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error(auth.error);

  const week = await db.week.findUnique({ where: { id: weekId } });
  if (!week) return;

  const updated = await db.week.update({
    where: { id: weekId },
    data: { isSkipped: !week.isSkipped },
  });

  await db.auditLog.create({
    data: {
      action: `Week ${week.weekNumber} ${updated.isSkipped ? "marked as skipped" : "un-skipped"}`,
      entityType: "Week",
      entityId: weekId,
      before: { isSkipped: week.isSkipped },
      after: { isSkipped: updated.isSkipped },
    },
  });

  revalidatePath("/admin/weeks");
  revalidatePath("/admin/payments");
}

export async function updateWeekNotes(
  weekId: string,
  notes: string
): Promise<void> {
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error(auth.error);

  await db.week.update({
    where: { id: weekId },
    data: { notes: notes.trim() || null },
  });
  revalidatePath("/admin/weeks");
}
