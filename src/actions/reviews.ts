"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function submitReviewRequest(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const token = formData.get("token") as string;
  const weekId = formData.get("weekId") as string;
  const claimedStatus = formData.get("claimedStatus") as string;
  const claimedDateRaw = formData.get("claimedDate") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!token || !weekId || !claimedStatus || !claimedDateRaw) {
    return { error: "All required fields must be filled." };
  }

  const member = await db.member.findUnique({
    where: { token },
    select: { id: true },
  });
  if (!member) return { error: "Member not found." };

  const claimedDate = new Date(claimedDateRaw);
  if (isNaN(claimedDate.getTime())) return { error: "Invalid date." };

  // Check no duplicate pending request for same week
  const existing = await db.paymentReviewRequest.findFirst({
    where: { memberId: member.id, weekId, status: "PENDING" },
  });
  if (existing) {
    return { error: "You already have a pending request for this week." };
  }

  await db.paymentReviewRequest.create({
    data: {
      memberId: member.id,
      weekId,
      claimedStatus,
      claimedDate,
      notes,
    },
  });

  revalidatePath(`/m/${token}`);
  return { success: true };
}

export async function approveReview(
  requestId: string,
  adminNote: string | null
): Promise<{ error?: string }> {
  const req = await db.paymentReviewRequest.findUnique({
    where: { id: requestId },
    include: { member: true, week: true },
  });
  if (!req) return { error: "Request not found." };

  // Map claimedStatus → PaymentStatus
  const statusMap: Record<string, "PAID" | "LATE" | "PENDING"> = {
    CASH: "PAID",
    ZELLE: "PAID",
    WON: "PAID",
    DOUBLE: "PAID",
    OTHER: "PAID",
  };
  const methodMap: Record<string, "CASH" | "ZELLE" | "OTHER"> = {
    CASH: "CASH",
    ZELLE: "ZELLE",
    WON: "OTHER",
    DOUBLE: "OTHER",
    OTHER: "OTHER",
  };

  const newStatus = statusMap[req.claimedStatus] ?? "PAID";
  const newMethod = methodMap[req.claimedStatus] ?? "OTHER";

  const payment = await db.payment.findFirst({
    where: { memberId: req.memberId, weekId: req.weekId },
  });

  if (payment) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: newStatus, method: newMethod, paidAt: req.claimedDate },
    });
  }

  await db.paymentReviewRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED", adminNote: adminNote || null },
  });

  await db.auditLog.create({
    data: {
      action: "REVIEW_APPROVED",
      entityType: "PaymentReviewRequest",
      entityId: requestId,
      after: { claimedStatus: req.claimedStatus, adminNote },
    },
  });

  revalidatePath("/admin/reviews");
  revalidatePath(`/m/${req.member.token}`);
  return {};
}

export async function rejectReview(
  requestId: string,
  adminNote: string | null
): Promise<{ error?: string }> {
  const req = await db.paymentReviewRequest.findUnique({
    where: { id: requestId },
    include: { member: true },
  });
  if (!req) return { error: "Request not found." };

  await db.paymentReviewRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", adminNote: adminNote || null },
  });

  await db.auditLog.create({
    data: {
      action: "REVIEW_REJECTED",
      entityType: "PaymentReviewRequest",
      entityId: requestId,
      after: { adminNote },
    },
  });

  revalidatePath("/admin/reviews");
  revalidatePath(`/m/${req.member.token}`);
  return {};
}
