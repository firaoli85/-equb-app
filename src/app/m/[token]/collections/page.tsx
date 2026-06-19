export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDate, TOTAL_WEEKS } from "@/lib/equb";
import { notFound, redirect } from "next/navigation";

export default async function MemberCollectionsPage({
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

  // One row per collected lucky number, ordered by week then number.
  // Source of truth: WeekPayout rows (live status/method fields).
  const payouts = await db.weekPayout.findMany({
    where: { status: "COLLECTED" },
    include: { week: { select: { weekNumber: true, date: true } } },
    orderBy: [{ week: { weekNumber: "asc" } }, { number: "asc" }],
  });

  // Count by distinct drawn weeks (Week 2 with #5 + #13 = 1 week, not 2)
  const distinctCollectedWeeks = new Set(payouts.map((p) => p.week.weekNumber)).size;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Collection History</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          {distinctCollectedWeeks} of {TOTAL_WEEKS} collections completed · lucky numbers only
        </p>
      </div>

      {payouts.length === 0 ? (
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No collections yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Collections are recorded after each weekly draw</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            <div>Week</div>
            <div>Date</div>
            <div>Lucky #</div>
            <div>Status</div>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {payouts.map((payout) => (
              <div key={payout.id} className="grid grid-cols-4 gap-3 px-5 py-4 items-center">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Week {payout.week.weekNumber}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(payout.week.date)}
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    #{payout.number}
                  </span>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Paid out
                    {payout.method && (
                      <span className="text-emerald-500 dark:text-emerald-600">
                        · {payout.method}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remaining slots */}
      {distinctCollectedWeeks < TOTAL_WEEKS && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          {TOTAL_WEEKS - distinctCollectedWeeks} collection{TOTAL_WEEKS - distinctCollectedWeeks !== 1 ? "s" : ""} remaining
        </p>
      )}
    </div>
  );
}
