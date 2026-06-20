export const dynamic = "force-dynamic";

import { Fragment } from "react";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, getAvailableWheelEntries } from "@/lib/equb";
import { PayoutForm } from "@/components/admin/PayoutForm";
import { WinnerControls } from "@/components/admin/WinnerControls";
import { AddWinnerForm } from "@/components/admin/AddWinnerForm";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  ZELLE: "Zelle",
  BOTH: "Cash + Zelle",
  CASHAPP: "CashApp",
  VENMO: "Venmo",
  BANK: "Bank",
  OTHER: "Other",
};

const TH = "text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider";

export default async function CollectionPage() {
  const [members, weeks] = await Promise.all([
    db.member.findMany({ where: { isArchived: false }, orderBy: { wheelNumber: "asc" } }),
    db.week.findMany({
      orderBy: { weekNumber: "asc" },
      include: {
        payouts: {
          include: {
            member: { select: { nameAmharic: true, nameEnglishFirst: true } },
          },
          orderBy: { number: "asc" },
        },
      },
    }),
  ]);

  // WeekPayout rows are now the source of truth for drawn numbers and status
  const allPayouts = weeks.flatMap((w) => w.payouts);
  const allWeekOptions = weeks.map((w) => ({ id: w.id, weekNumber: w.weekNumber, date: w.date.toISOString() }));
  const drawnSet = new Set(allPayouts.map((p) => p.number));

  const allWheelNumbers: number[] = [];
  for (const m of members) {
    allWheelNumbers.push(m.wheelNumber);
    if (m.extraWheelNumber !== null) allWheelNumbers.push(m.extraWheelNumber);
  }

  const remaining = getAvailableWheelEntries(members, drawnSet);
  const drawnCount     = allPayouts.length;
  const collectedCount = allPayouts.filter((p) => p.status === "COLLECTED").length;
  const pendingCount   = allPayouts.filter((p) => p.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Collection Tracker</h1>

      {/* Summary stats — per-number counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Drawn",     value: drawnCount,     sub: `of ${allWheelNumbers.length} entries`,  color: "text-blue-600 dark:text-blue-400" },
          { label: "Collected", value: collectedCount, sub: "payouts done",                           color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Pending",   value: pendingCount,   sub: "awaiting payout",                        color: "text-amber-600 dark:text-amber-400" },
          { label: "Remaining", value: remaining.length, sub: "not yet drawn",                        color: "text-gray-600 dark:text-gray-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm"
          >
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {s.label}
            </p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Number chips — each chip reflects that number's own WeekPayout.status */}
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Drawn — Collected &amp; Pending
          </p>
          <div className="flex flex-wrap gap-2">
            {allPayouts.length === 0 ? (
              <span className="text-sm text-gray-400">None drawn yet</span>
            ) : (
              weeks.flatMap((week) =>
                week.payouts.map((payout) => {
                  const isCollected = payout.status === "COLLECTED";
                  return (
                    <span
                      key={payout.id}
                      title={`Week ${week.weekNumber} — ${isCollected ? "Collected" : "Pending"}`}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border ${
                        isCollected
                          ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                          : "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      #{payout.number}
                      <span className="font-normal text-xs opacity-60">Wk {week.weekNumber}</span>
                    </span>
                  );
                })
              )
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Remaining — Not yet drawn
          </p>
          <div className="flex flex-wrap gap-2">
            {remaining.length === 0 ? (
              <span className="text-sm text-gray-400">All drawn!</span>
            ) : (
              remaining.map((n) => (
                <span
                  key={n}
                  className="px-3 py-1 rounded-full text-sm font-bold bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                >
                  #{n}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Payout table — one row per WeekPayout, grouped by week */}
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Weekly Payout Records
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className={TH}>Week</th>
                <th className={TH}>Date</th>
                <th className={TH}>Lucky #</th>
                <th className={TH}>Member</th>
                <th className={TH}>Type</th>
                <th className={`${TH} text-right`}>Amount</th>
                <th className={TH}>Status</th>
                <th className={TH}>Method</th>
                <th className={TH}>Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {weeks.map((week) => {
                // Week with no winners yet — single empty row
                if (week.payouts.length === 0) {
                  return (
                    <tr key={week.id} className="text-gray-400 dark:text-gray-600">
                      <td className="px-4 py-3 font-medium">Week {week.weekNumber}</td>
                      <td className="px-4 py-3">{formatDate(week.date)}</td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3 text-right">—</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 px-2 py-0.5 rounded-full">
                          Not drawn
                        </span>
                      </td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3">—</td>
                    </tr>
                  );
                }

                // Week with one or more winners — one row per WeekPayout
                return (
                  <Fragment key={week.id}>
                    {week.payouts.map((payout, idx) => {
                      const isFirst     = idx === 0;
                      const isCollected = payout.status === "COLLECTED";
                      const memberName  = payout.member?.nameAmharic ?? "—";
                      const amountCents = payout.amount
                        ? Math.round(Number(payout.amount) * 100)
                        : null;

                      return (
                        <tr
                          key={payout.id}
                          className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors"
                        >
                          {/* Week + Date only on first payout row of the group */}
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                            {isFirst ? `Week ${week.weekNumber}` : ""}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                            {isFirst ? formatDate(week.date) : ""}
                          </td>

                          <td className="px-4 py-3">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              #{payout.number}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                            {memberName}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                payout.wheelType === "EXTRA"
                                  ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                  : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                              }`}
                            >
                              {payout.wheelType}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                            {amountCents != null ? formatCurrency(amountCents) : "—"}
                          </td>

                          <td className="px-4 py-3">
                            {isCollected ? (
                              <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                Collected
                              </span>
                            ) : (
                              <span className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                Pending
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                            {payout.method ? METHOD_LABEL[payout.method] : "—"}
                          </td>

                          <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs max-w-xs truncate">
                            {payout.notes ?? "—"}
                          </td>

                          <td className="px-4 py-3">
                            <PayoutForm
                              weekPayoutId={payout.id}
                              currentStatus={payout.status}
                              currentMethod={payout.method ?? null}
                              currentNotes={payout.notes ?? ""}
                              signedAt={payout.signedAt?.toISOString() ?? null}
                            />
                            <WinnerControls
                              weekPayoutId={payout.id}
                              weekNumber={week.weekNumber}
                              payoutNumber={payout.number}
                              status={payout.status}
                              signedAt={payout.signedAt?.toISOString() ?? null}
                              currentWeekId={week.id}
                              allWeeks={allWeekOptions}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddWinnerForm weeks={allWeekOptions} />
    </div>
  );
}

