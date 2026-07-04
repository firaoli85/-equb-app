export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getCurrentWeekNumber, TOTAL_WEEKS, formatDate, getDisplayName } from "@/lib/equb";
import { notFound, redirect } from "next/navigation";
import { MemberStandingList } from "@/components/member/MemberStandingList";

export default async function MemberPaymentsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const currentWeekNum = getCurrentWeekNumber();

  // Viewer lookup — include name + payment history for the pinned "your row"
  const viewer = await db.member.findUnique({
    where: { token },
    select: {
      id: true,
      confirmedAt: true,
      nameAmharic: true,
      nameEnglishFirst: true,
      displayPreference: true,
      payments: {
        select: {
          status: true,
          week: { select: { weekNumber: true } },
        },
      },
    },
  });
  if (!viewer) notFound();
  if (!viewer.confirmedAt) redirect(`/m/${token}`);

  // Fetch in parallel: all other confirmed members, shared weeks, and
  // authoritative total count (includes viewer — single source of truth)
  const [members, allWeeks, totalMemberCount] = await Promise.all([
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
        // weeklyAmount, wheelNumber, extraWheelNumber intentionally absent — privacy
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
    db.member.count({
      where: { isArchived: false, confirmedAt: { not: null } },
    }),
  ]);

  const sharedWeeks = allWeeks.map((w) => ({
    id: w.id,
    weekNumber: w.weekNumber,
    date: formatDate(w.date),
  }));

  // Strict server-side type — only these fields cross the server/client boundary.
  // phone, pin, token, weeklyAmount, wheelNumber, extraWheelNumber, payoutMethod
  // are never selected from the DB above and must never appear here.
  // Name fields are coalesced to "" so the client always receives plain strings.
  type SanitizedPeer = {
    id: string;
    nameAmharic: string;
    nameEnglishFirst: string;
    nameEnglishLast: string;
    paidCount: number;
    behindCount: number;
    weekPayments: { weekNumber: number; status: string }[];
  };

  // Compute per-member standing — weeks only, no dollar math.
  // Bug 2 fix: behindCount = max(0, elapsed − paid − deferred).
  // DEFERRED weeks are excused and must NOT count as behind.
  // Any elapsed week that is not PAID and not DEFERRED counts against the member,
  // whether it is LATE, PARTIAL, or simply absent from payment records.
  const standings: SanitizedPeer[] = members.map((m) => {
    const paidCount = m.payments.filter((p) => p.status === "PAID").length;
    const deferredCount = m.payments.filter(
      (p) => p.status === "DEFERRED" && p.week.weekNumber <= currentWeekNum
    ).length;
    const behindCount = Math.max(0, currentWeekNum - paidCount - deferredCount);

    return {
      id: m.id,
      nameAmharic: m.nameAmharic ?? "",
      nameEnglishFirst: m.nameEnglishFirst ?? "",
      nameEnglishLast: m.nameEnglishLast ?? "",
      paidCount,
      behindCount,
      weekPayments: m.payments.map((p) => ({
        weekNumber: p.week.weekNumber,
        status: p.status as string,
      })),
    };
  });

  // Viewer's own payment stats (same formula)
  const viewerPaidCount = viewer.payments.filter((p) => p.status === "PAID").length;
  const viewerDeferredCount = viewer.payments.filter(
    (p) => p.status === "DEFERRED" && p.week.weekNumber <= currentWeekNum
  ).length;
  const viewerBehindCount = Math.max(
    0,
    currentWeekNum - viewerPaidCount - viewerDeferredCount
  );

  // Display name honouring language preference
  const viewerDisplayName = getDisplayName({
    nameAmharic: viewer.nameAmharic,
    nameEnglishFirst: viewer.nameEnglishFirst,
    displayPreference: viewer.displayPreference,
  });

  // How many members (including viewer) are fully current this week
  const currentCount =
    standings.filter((m) => m.behindCount === 0).length +
    (viewerBehindCount === 0 ? 1 : 0);

  // Bug 1 fix: use authoritative DB count as the canonical total.
  // standings.length + 1 was wrong whenever the viewer was already counted
  // in a cached or stale count elsewhere in the app.
  const totalCount = totalMemberCount;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <MemberStandingList
        members={standings}
        weeks={sharedWeeks}
        totalWeeks={TOTAL_WEEKS}
        token={token}
        currentCount={currentCount}
        totalCount={totalCount}
        viewerDisplayName={viewerDisplayName}
        viewerPaidCount={viewerPaidCount}
        viewerBehindCount={viewerBehindCount}
        currentWeekNum={currentWeekNum}
      />
    </div>
  );
}
