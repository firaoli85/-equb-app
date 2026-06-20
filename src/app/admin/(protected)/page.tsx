export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  getAvailableWheelEntries,
  formatDate,
  getCurrentWeekNumber,
  TOTAL_WEEKS,
} from "@/lib/equb";
import { DashboardShell } from "@/components/admin/DashboardShell";

export default async function AdminDashboard() {
  const now = new Date();

  const [members, weeks, lockedMembers, wheelSlots, allPayouts, archiveCount, pendingReviews] =
    await Promise.all([
      db.member.findMany({ where: { isArchived: false }, orderBy: { wheelNumber: "asc" } }),
      db.week.findMany({ orderBy: { weekNumber: "asc" } }),
      db.member.findMany({
        where: { isArchived: false, pinLockedUntil: { not: null, gt: now } },
        select: {
          id: true,
          nameAmharic: true,
          nameEnglishFirst: true,
          phone: true,
          pinLockedUntil: true,
        },
        orderBy: { pinLockedUntil: "asc" },
      }),
      db.wheelSlot.findMany({ orderBy: { position: "asc" } }),
      db.weekPayout.findMany({ select: { number: true, status: true, weekId: true } }),
      db.equbArchive.count(),
      db.paymentReviewRequest.count({ where: { status: "PENDING" } }),
    ]);

  const drawnNumbers = new Set(allPayouts.map((p) => p.number));
  const availableNumbers = getAvailableWheelEntries(members, drawnNumbers);
  const eligibleWheelSlots = wheelSlots.filter((s) =>
    s.numbers.every((n) => !drawnNumbers.has(n))
  );

  const undrawnWeeks = weeks
    .filter((w) => w.winnerWheelNumber == null && !w.isSkipped)
    .map((w) => ({ id: w.id, weekNumber: w.weekNumber, date: formatDate(w.date) }));

  const week1Date = weeks.find((w) => w.weekNumber === 1)?.date;
  const currentWeekNum = getCurrentWeekNumber(week1Date ?? undefined);
  const currentWeek = weeks.find((w) => w.weekNumber === currentWeekNum);

  const weeksRemaining =
    currentWeekNum === 0
      ? TOTAL_WEEKS
      : Math.max(0, TOTAL_WEEKS - currentWeekNum + 1);

  const collectionsDone = allPayouts.filter((p) => p.status === "COLLECTED").length;

  return (
    <DashboardShell
      pendingReviews={pendingReviews}
      lockedMembers={lockedMembers.map((m) => ({
        id: m.id,
        nameAmharic: m.nameAmharic,
        nameEnglishFirst: m.nameEnglishFirst,
        phone: m.phone,
        pinLockedUntil: m.pinLockedUntil!.toISOString(),
      }))}
      archiveCount={archiveCount}
      collectionsDone={collectionsDone}
      totalWeeks={TOTAL_WEEKS}
      slots={eligibleWheelSlots}
      availableNumbers={availableNumbers}
      weekOptions={undrawnWeeks}
      currentWeekNum={currentWeekNum}
      currentWeekDate={currentWeek ? formatDate(currentWeek.date) : null}
      weeksRemaining={weeksRemaining}
    />
  );
}
