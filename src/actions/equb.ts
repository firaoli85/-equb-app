"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { generateWeekDates, TOTAL_WEEKS } from "@/lib/equb";

export async function endEqub(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const rawDate = (formData.get("newStartDate") as string | null)?.trim();
  if (!rawDate) return { error: "New start date is required." };

  const newStartDate = new Date(rawDate + "T00:00:00.000Z");
  if (isNaN(newStartDate.getTime())) return { error: "Invalid date." };

  // Verify all collections are confirmed
  const collectionsDone = await db.week.count({ where: { payoutStatus: "COLLECTED" } });
  if (collectionsDone < TOTAL_WEEKS) {
    return {
      error: `Only ${collectionsDone} of ${TOTAL_WEEKS} collections are confirmed. All payouts must be collected before ending the Equb.`,
    };
  }

  // Build snapshot
  const [members, weeks, payments] = await Promise.all([
    db.member.findMany({ orderBy: { wheelNumber: "asc" } }),
    db.week.findMany({ orderBy: { weekNumber: "asc" } }),
    db.payment.findMany({
      include: {
        week: { select: { weekNumber: true } },
        member: { select: { wheelNumber: true } },
      },
    }),
  ]);

  const cycleCount = await db.equbArchive.count();
  const week1 = weeks.find((w) => w.weekNumber === 1);
  const week20 = weeks.find((w) => w.weekNumber === TOTAL_WEEKS);

  const snapshot = {
    summary: {
      memberCount: members.length,
      weeklyPotCents: members.reduce((s, m) => s + m.weeklyAmount, 0),
      collectionsDone,
    },
    members: members.map((m) => ({
      nameAmharic: m.nameAmharic,
      nameEnglishFirst: m.nameEnglishFirst,
      nameEnglishLast: m.nameEnglishLast,
      weeklyAmount: m.weeklyAmount,
      wheelNumber: m.wheelNumber,
      extraWheelNumber: m.extraWheelNumber,
    })),
    weeks: weeks.map((w) => ({
      weekNumber: w.weekNumber,
      date: w.date.toISOString(),
      isSkipped: w.isSkipped,
      winnerWheelNumber: w.winnerWheelNumber,
      payoutStatus: w.payoutStatus,
      notes: w.notes ?? null,
    })),
    payments: payments.map((p) => ({
      memberWheelNumber: p.member.wheelNumber,
      weekNumber: p.week.weekNumber,
      status: p.status,
      method: p.method ?? null,
      paidAt: p.paidAt?.toISOString() ?? null,
      notes: p.notes ?? null,
    })),
  };

  await db.equbArchive.create({
    data: {
      cycleNumber: cycleCount + 1,
      startDate: week1!.date,
      endDate: week20!.date,
      snapshot: JSON.parse(JSON.stringify(snapshot)),
    },
  });

  // Reset: delete review requests and weeks (payments cascade from weeks)
  await db.$transaction([
    db.paymentReviewRequest.deleteMany({}),
    db.auditLog.deleteMany({}),
    db.week.deleteMany({}),
    db.member.updateMany({
      data: {
        wheelSuspended: false,
        collectionConfirmedAt: null,
        collectionConfirmedIp: null,
        collectionConfirmedAtExtra: null,
        collectionConfirmedIpExtra: null,
        collectionConfirmedFingerprint: Prisma.DbNull,
        collectionConfirmedFingerprintExtra: Prisma.DbNull,
        pinAttempts: 0,
        pinLockedUntil: null,
      },
    }),
  ]);

  // Seed new weeks
  const newWeekDates = generateWeekDates(newStartDate);
  await db.week.createMany({
    data: newWeekDates.map((date, i) => ({ weekNumber: i + 1, date })),
  });

  // Create payments for all members × new weeks
  const [freshMembers, freshWeeks] = await Promise.all([
    db.member.findMany({ select: { id: true } }),
    db.week.findMany({ select: { id: true } }),
  ]);

  await db.payment.createMany({
    data: freshMembers.flatMap((m) =>
      freshWeeks.map((w) => ({ memberId: m.id, weekId: w.id }))
    ),
  });

  // Audit log for new cycle
  await db.auditLog.create({
    data: {
      action: `Equb cycle ${cycleCount + 1} archived. New cycle starts ${rawDate}.`,
      entityType: "EqubArchive",
      entityId: "system",
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteArchive(
  archiveId: string
): Promise<{ error?: string; success?: boolean }> {
  await db.equbArchive.delete({ where: { id: archiveId } });

  await db.auditLog.create({
    data: {
      action: `Archive ${archiveId} permanently deleted.`,
      entityType: "EqubArchive",
      entityId: archiveId,
    },
  });

  revalidatePath("/admin/archive");
  return { success: true };
}
