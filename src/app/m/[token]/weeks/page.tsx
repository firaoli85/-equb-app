export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDate, getCurrentWeekNumber, TOTAL_WEEKS, EQUB_START } from "@/lib/equb";
import { notFound, redirect } from "next/navigation";

export default async function MemberWeeksPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const viewer = await db.member.findUnique({
    where: { token },
    select: { confirmedAt: true },
  });
  if (!viewer) notFound();
  if (!viewer.confirmedAt) redirect(`/m/${token}`);

  const [weeks, payments] = await Promise.all([
    db.week.findMany({ orderBy: { weekNumber: "asc" } }),
    db.payment.findMany({ select: { weekId: true, status: true } }),
  ]);

  const memberCount = await db.member.count();

  // Payment counts by week
  const paidByWeek = new Map<string, number>();
  for (const p of payments) {
    if (p.status === "PAID") {
      paidByWeek.set(p.weekId, (paidByWeek.get(p.weekId) ?? 0) + 1);
    }
  }

  const week1Date = weeks.find((w) => w.weekNumber === 1)?.date ?? EQUB_START;
  const currentWeekNum = getCurrentWeekNumber(week1Date);

  function weekStatus(week: { weekNumber: number; isSkipped: boolean; winnerWheelNumber: number | null }) {
    if (week.isSkipped) return { label: "Skipped", cls: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" };
    if (week.winnerWheelNumber !== null) return { label: "Collected", cls: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" };
    if (week.weekNumber === currentWeekNum) return { label: "Open", cls: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" };
    if (week.weekNumber < currentWeekNum) return { label: "Past", cls: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700" };
    return { label: "Upcoming", cls: "bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-800" };
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Weeks Overview</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          {TOTAL_WEEKS} weeks · read-only
        </p>
      </div>

      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {weeks.map((week) => {
            const paidCount = paidByWeek.get(week.id) ?? 0;
            const progressPct = memberCount > 0 ? Math.round((paidCount / memberCount) * 100) : 0;
            const status = weekStatus(week);
            const isCurrent = week.weekNumber === currentWeekNum;

            return (
              <div
                key={week.id}
                className={`px-5 py-4 flex items-center gap-4 ${
                  isCurrent ? "bg-blue-50/50 dark:bg-blue-950/10" : ""
                } ${week.isSkipped ? "opacity-60" : ""}`}
              >
                {/* Week number */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                  isCurrent
                    ? "bg-blue-600 text-white"
                    : week.winnerWheelNumber !== null
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}>
                  {week.weekNumber}
                </div>

                {/* Date + progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {formatDate(week.date)}
                    </p>
                    {isCurrent && (
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">← Current</span>
                    )}
                  </div>
                  {!week.isSkipped && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        {paidCount}/{memberCount} paid
                      </span>
                    </div>
                  )}
                  {week.winnerWheelNumber !== null && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                      Collected — Lucky #{week.winnerWheelNumber}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${status.cls}`}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
