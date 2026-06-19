export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getCurrentWeekNumber, TOTAL_WEEKS, formatDate } from "@/lib/equb";
import { notFound, redirect } from "next/navigation";
import { MemberStandingList } from "@/components/member/MemberStandingList";

export default async function MemberPaymentsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Viewer lookup — id added so we can exclude them from the peer list
  const viewer = await db.member.findUnique({
    where: { token },
    select: { id: true, confirmedAt: true },
  });
  if (!viewer) notFound();
  if (!viewer.confirmedAt) redirect(`/m/${token}`);

  const currentWeekNum = getCurrentWeekNumber();

  // Fetch in parallel: all other confirmed members + the shared week list
  const [members, allWeeks] = await Promise.all([
    db.member.findMany({
      where: {
        isArchived: false,
        confirmedAt: { not: null },
        id: { not: viewer.id },
      },
      orderBy: [{ nameEnglishFirst: "asc" }],
      select: {
        id: true,
        nameAmharic: true,
        nameEnglishFirst: true,
        nameEnglishLast: true,
        // weeklyAmount, wheelNumber, extraWheelNumber intentionally absent
        payments: {
          select: {
            status: true,
            week: { select: { weekNumber: true } },
          },
        },
      },
    }),
    db.week.findMany({
      orderBy: { weekNumber: "asc" },
      select: { id: true, weekNumber: true, date: true },
    }),
  ]);

  // Format dates server-side — no Date objects cross the serialization boundary
  const sharedWeeks = allWeeks.map((w) => ({
    id: w.id,
    weekNumber: w.weekNumber,
    date: formatDate(w.date),
  }));

  // Compute per-member standing — weeks only, no dollar math
  const standings = members.map((m) => {
    const paidCount = m.payments.filter((p) => p.status === "PAID").length;
    const behindCount =
      // LATE / DEFERRED only count for weeks that have already passed
      m.payments.filter(
        (p) =>
          (p.status === "LATE" || p.status === "DEFERRED") &&
          p.week.weekNumber <= currentWeekNum
      ).length +
      // PARTIAL always counts as behind regardless of week position
      m.payments.filter((p) => p.status === "PARTIAL").length;

    return {
      id: m.id,
      nameAmharic: m.nameAmharic,
      nameEnglishFirst: m.nameEnglishFirst,
      nameEnglishLast: m.nameEnglishLast,
      paidCount,
      behindCount,
      // Per-week statuses for the detail sheet — status + weekNumber only
      weekPayments: m.payments.map((p) => ({
        weekNumber: p.week.weekNumber,
        status: p.status as string,
      })),
    };
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <MemberStandingList
        members={standings}
        weeks={sharedWeeks}
        totalWeeks={TOTAL_WEEKS}
        token={token}
      />
    </div>
  );
}
