"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
type PaymentStatus = "PENDING" | "PAID" | "LATE" | "DEFERRED" | "PARTIAL";
type PaymentMethod = "CASH" | "ZELLE" | "OTHER";

export async function updatePaymentStatus(data: {
  paymentId: string;
  status: PaymentStatus;
  method?: PaymentMethod | null;
  notes?: string;
}): Promise<{ error?: string }> {
  const payment = await db.payment.findUnique({
    where: { id: data.paymentId },
    include: { member: true, week: true },
  });
  if (!payment) return { error: "Payment not found" };

  const before = { status: payment.status, method: payment.method, notes: payment.notes };

  const updated = await db.payment.update({
    where: { id: data.paymentId },
    data: {
      status: data.status,
      method: data.method ?? null,
      notes: data.notes ?? null,
      paidAt: data.status === "PAID" ? (payment.paidAt ?? new Date()) : null,
    },
  });

  const after = { status: updated.status, method: updated.method, notes: updated.notes };

  const displayName = `${payment.member.nameAmharic} (${payment.member.nameEnglishFirst})`;

  const actionLabel =
    data.status === "DEFERRED"
      ? `Payment deferred — skip request approved for ${displayName}, Week ${payment.week.weekNumber}`
      : data.status === "PARTIAL"
      ? `Partial payment recorded — ${displayName}, Week ${payment.week.weekNumber}${data.method ? ` via ${data.method}` : ""}`
      : `Payment ${data.status.toLowerCase()} — ${displayName}, Week ${payment.week.weekNumber}${data.method ? ` via ${data.method}` : ""}`;

  await db.auditLog.create({
    data: {
      action: actionLabel,
      entityType: "Payment",
      entityId: data.paymentId,
      before,
      after,
    },
  });

  // Auto-suspension: only LATE payments count; DEFERRED never triggers this
  if (data.status === "LATE" && !payment.member.wheelSuspended) {
    await checkAndAutoSuspend(payment.member.id, payment.week.weekNumber);
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return {};
}

async function checkAndAutoSuspend(memberId: string, currentWeekNumber: number): Promise<void> {
  if (currentWeekNumber < 2) return;

  const recentPayments = await db.payment.findMany({
    where: { memberId },
    include: { week: true },
    orderBy: { week: { weekNumber: "desc" } },
    take: 2,
  });

  const allLate = recentPayments.length >= 2 && recentPayments.every((p: { status: string }) => p.status === "LATE");
  if (!allLate) return;

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member || member.wheelSuspended) return;

  await db.member.update({ where: { id: memberId }, data: { wheelSuspended: true } });

  await db.auditLog.create({
    data: {
      action: `Auto-suspended from wheel: ${member.nameAmharic} (${member.nameEnglishFirst}) — 2 consecutive LATE payments`,
      entityType: "Member",
      entityId: memberId,
      before: { wheelSuspended: false },
      after: { wheelSuspended: true },
    },
  });
}
