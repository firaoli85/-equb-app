export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  calculatePot,
  calculateMemberFee,
  calculateMemberGross,
  calculateNetPayout,
  getAvailableWheelEntries,
  formatCurrency,
  formatDate,
  getCurrentWeekNumber,
  TOTAL_WEEKS,
} from "@/lib/equb";
import { SpinWheel } from "@/components/admin/SpinWheel";
import { EndEqubButton } from "@/components/admin/EndEqubButton";
import { LockedMembersPanel } from "@/components/admin/LockedMembersPanel";
import { PayoutReveal } from "@/components/admin/PayoutReveal";

export default async function AdminDashboard() {
  const now = new Date();
  const [members, weeks, recentLogs, archiveCount, lockedMembers] = await Promise.all([
    db.member.findMany({ where: { isArchived: false }, orderBy: { wheelNumber: "asc" } }),
    db.week.findMany({ orderBy: { weekNumber: "asc" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.equbArchive.count(),
    db.member.findMany({
      where: { isArchived: false, pinLockedUntil: { not: null, gt: now } },
      select: { id: true, nameAmharic: true, nameEnglishFirst: true, phone: true, pinLockedUntil: true },
      orderBy: { pinLockedUntil: "asc" },
    }),
  ]);

  const drawnNumbers = new Set(
    weeks.filter((w) => w.winnerWheelNumber != null).map((w) => w.winnerWheelNumber!)
  );
  const availableNumbers = getAvailableWheelEntries(members, drawnNumbers);

  const wheelEntries = members.flatMap((m) => {
    const entries = [];
    if (!drawnNumbers.has(m.wheelNumber))
      entries.push({ number: m.wheelNumber, name: m.nameAmharic, isExtra: false });
    if (m.extraWheelNumber !== null && !drawnNumbers.has(m.extraWheelNumber))
      entries.push({ number: m.extraWheelNumber, name: m.nameAmharic, isExtra: true });
    return entries;
  });

  const undrawnWeeks = weeks
    .filter((w) => w.winnerWheelNumber == null && !w.isSkipped)
    .map((w) => ({ id: w.id, weekNumber: w.weekNumber, date: formatDate(w.date) }));

  const week1Date = weeks.find((w) => w.weekNumber === 1)?.date;
  const currentWeekNum = getCurrentWeekNumber(week1Date ?? undefined);
  const currentWeek = weeks.find((w) => w.weekNumber === currentWeekNum);
  const potCents = calculatePot(members);

  let paidThisWeek = 0;
  let totalExpectedThisWeek = 0;
  if (currentWeek) {
    const payments = await db.payment.findMany({ where: { weekId: currentWeek.id } });
    const memberMap = new Map(members.map((m) => [m.id, m]));
    for (const p of payments) {
      const m = memberMap.get(p.memberId);
      if (m) {
        totalExpectedThisWeek += m.weeklyAmount;
        if (p.status === "PAID") paidThisWeek += m.weeklyAmount;
      }
    }
  }
  const progressPct = totalExpectedThisWeek > 0
    ? Math.round((paidThisWeek / totalExpectedThisWeek) * 100)
    : 0;

  const nextPayoutMember = members.find((m) => m.wheelNumber === currentWeekNum);
  const nextPayoutWeek = weeks.find((w) => w.weekNumber === currentWeekNum);

  const weeksRemaining = currentWeekNum === 0
    ? TOTAL_WEEKS
    : Math.max(0, TOTAL_WEEKS - currentWeekNum + 1);

  const weeksCompleted = currentWeekNum === 0 ? 0 : Math.min(currentWeekNum, TOTAL_WEEKS);
  const collectionsDone = weeks.filter((w) => w.payoutStatus === "COLLECTED").length;
  const numbersOnWheel = availableNumbers.length;

  const logDotColor = (type: string) =>
    type === "Payment"
      ? "bg-emerald-500"
      : type === "Member"
      ? "bg-blue-500"
      : "bg-amber-500";

  return (
    <div className="space-y-6">
      <LockedMembersPanel
        initialLocked={lockedMembers.map((m) => ({
          id: m.id,
          nameAmharic: m.nameAmharic,
          nameEnglishFirst: m.nameEnglishFirst,
          phone: m.phone,
          pinLockedUntil: m.pinLockedUntil!.toISOString(),
        }))}
      />

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white animate-fade-in-up">
        Dashboard
      </h1>

      {/* Stats — row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up-1">
        <StatCard
          label="Weekly Pot"
          value={formatCurrency(2_000_000)}
          sub={`Actual: ${formatCurrency(potCents)}`}
          valueClass="text-emerald-600 dark:text-emerald-400"
          accent
        />
        <StatCard
          label="Current Week"
          value={currentWeekNum > 0 ? `Week ${currentWeekNum}` : "Not started"}
          sub={currentWeek ? formatDate(currentWeek.date) : "Starts May 17, 2026"}
        />
        <StatCard label="Members" value={String(members.length)} />
        <StatCard
          label="Weeks Remaining"
          value={String(weeksRemaining)}
          sub={`of ${TOTAL_WEEKS} total`}
        />
      </div>

      {/* Stats — row 2 */}
      <div className="grid grid-cols-3 gap-4 animate-fade-in-up-1">
        <StatCard
          label="Lucky Numbers"
          value={String(numbersOnWheel)}
          sub="lucky numbers remaining"
          valueClass="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label="Collections Done"
          value={`${collectionsDone} of ${TOTAL_WEEKS}`}
          sub="payouts collected"
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Weeks Completed"
          value={`${weeksCompleted} of ${TOTAL_WEEKS}`}
          sub={weeksCompleted > 0 ? `${TOTAL_WEEKS - weeksCompleted} remaining` : "Starts May 17, 2026"}
        />
      </div>

      {/* Summary line */}
      <p className="text-sm text-gray-500 dark:text-gray-400 animate-fade-in-up-1">
        <span className="font-semibold text-gray-700 dark:text-gray-300">{numbersOnWheel}</span>{" "}
        lucky number{numbersOnWheel !== 1 ? "s" : ""} remaining
        {" — "}
        <span className="font-semibold text-gray-700 dark:text-gray-300">{collectionsDone}</span>{" "}
        member{collectionsDone !== 1 ? "s" : ""} {collectionsDone !== 1 ? "have" : "has"} collected
      </p>

      {/* Collection Progress */}
      {currentWeek && (
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm animate-fade-in-up-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Week {currentWeekNum} Collection
          </h2>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500 dark:text-gray-400">
              {formatCurrency(paidThisWeek)}{" "}
              <span className="text-gray-400 dark:text-gray-600">of</span>{" "}
              {formatCurrency(totalExpectedThisWeek)}
            </span>
            <span className="font-bold text-gray-900 dark:text-white">{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Next Payout */}
      {nextPayoutMember && nextPayoutWeek && (
        <PayoutReveal
          memberName={nextPayoutMember.nameAmharic}
          gross={formatCurrency(calculateMemberGross(nextPayoutMember.weeklyAmount))}
          fee={`−${formatCurrency(calculateMemberFee(nextPayoutMember.weeklyAmount))}`}
          net={formatCurrency(
            calculateNetPayout(
              calculateMemberGross(nextPayoutMember.weeklyAmount),
              calculateMemberFee(nextPayoutMember.weeklyAmount)
            )
          )}
          date={formatDate(nextPayoutWeek.date)}
        />
      )}

      {/* Spin Wheel */}
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm animate-fade-in-up-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-6 text-center">
          Weekly Draw
        </h2>
        <SpinWheel
          key={availableNumbers.join("-")}
          availableNumbers={availableNumbers}
          weekOptions={undrawnWeeks}
          wheelEntries={wheelEntries}
        />
      </div>

      {/* End of Equb */}
      {collectionsDone >= TOTAL_WEEKS && (
        <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-800/60 p-6 shadow-sm animate-fade-in-up-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">
                All {TOTAL_WEEKS} Collections Complete
              </h2>
              <p className="text-sm text-red-600 dark:text-red-400 max-w-md">
                Every member has collected their payout. Archive this cycle and begin a new one.
              </p>
            </div>
            <EndEqubButton cycleNumber={archiveCount + 1} />
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm animate-fade-in-up-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-5">
          Recent Activity
        </h2>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet.</p>
        ) : (
          <div className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-800 space-y-5">
            {recentLogs.map((log) => (
              <div key={log.id} className="relative">
                <div
                  className={`absolute -left-[25px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#141414] ${logDotColor(log.entityType)}`}
                />
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                  {log.action}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {process.env.NODE_ENV === "development" && (
        <div className="text-center pt-2 pb-4">
          <a
            href="/test/login-preview"
            className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 underline underline-offset-2 transition-colors"
          >
            Login Flow Preview (dev only)
          </a>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  valueClass,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        accent
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900"
          : "bg-white dark:bg-[#141414] border-gray-100 dark:border-gray-800"
      }`}
    >
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`text-2xl font-bold mt-1 ${
          valueClass ?? "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

