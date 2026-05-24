export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatCurrency, formatDate, calculatePot, calculateMemberFee, calculateMemberGross, calculateNetPayout, getAvailableWheelEntries, mainWheelWeekly, extraWheelWeekly } from "@/lib/equb";
import { updatePayoutRecord } from "@/actions/collection";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  ZELLE: "Zelle",
  BOTH: "Cash + Zelle",
};

export default async function CollectionPage() {
  const [members, weeks] = await Promise.all([
    db.member.findMany({ where: { isArchived: false }, orderBy: { wheelNumber: "asc" } }),
    db.week.findMany({ orderBy: { weekNumber: "asc" } }),
  ]);

  const potCents = calculatePot(members);
  const memberByWheel = new Map<number, typeof members[0]>();
  for (const m of members) {
    memberByWheel.set(m.wheelNumber, m);
    if (m.extraWheelNumber !== null) memberByWheel.set(m.extraWheelNumber, m);
  }

  const drawnNumbers = new Set(
    weeks.filter((w) => w.winnerWheelNumber != null).map((w) => w.winnerWheelNumber!)
  );
  // Include both primary and extra wheel numbers across all members
  const allWheelNumbers: number[] = [];
  for (const m of members) {
    allWheelNumbers.push(m.wheelNumber);
    if (m.extraWheelNumber !== null) allWheelNumbers.push(m.extraWheelNumber);
  }
  const remaining = getAvailableWheelEntries(members, drawnNumbers);
  const drawn = allWheelNumbers.filter((n) => drawnNumbers.has(n));

  const completedWeeks = weeks.filter((w) => w.winnerWheelNumber != null);
  const pendingWeeks = completedWeeks.filter((w) => w.payoutStatus !== "COLLECTED");
  const collectedWeeks = completedWeeks.filter((w) => w.payoutStatus === "COLLECTED");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Collection Tracker</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Drawn", value: drawn.length, sub: `of ${allWheelNumbers.length} entries`, color: "text-blue-600 dark:text-blue-400" },
          { label: "Collected", value: collectedWeeks.length, sub: "payouts done", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Pending", value: pendingWeeks.length, sub: "awaiting payout", color: "text-amber-600 dark:text-amber-400" },
          { label: "Remaining", value: remaining.length, sub: "not yet drawn", color: "text-gray-600 dark:text-gray-400" },
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

      {/* Number chips */}
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Drawn — Collected &amp; Pending
          </p>
          <div className="flex flex-wrap gap-2">
            {drawn.length === 0 ? (
              <span className="text-sm text-gray-400">None drawn yet</span>
            ) : (
              drawn.map((n) => {
                const week = completedWeeks.find((w) => w.winnerWheelNumber === n);
                const isCollected = week?.payoutStatus === "COLLECTED";
                return (
                  <span
                    key={n}
                    title={`Week ${week?.weekNumber} — ${isCollected ? "Collected" : "Pending"}`}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border ${
                      isCollected
                        ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    #{n}
                    <span className="font-normal text-xs opacity-60">Wk {week?.weekNumber}</span>
                  </span>
                );
              })
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

      {/* Payout table */}
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Week</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Wheel</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Net</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Method</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {weeks.map((week) => {
                const winner = week.winnerWheelNumber;
                const member = winner != null ? memberByWheel.get(winner) : null;
                const hasExtra = member?.extraWheelNumber != null;
                const isExtraWheel = hasExtra && winner === member?.extraWheelNumber;
                const weeklyAmt = member
                  ? isExtraWheel
                    ? extraWheelWeekly(member.weeklyAmount)
                    : mainWheelWeekly(member.weeklyAmount, hasExtra)
                  : 0;
                const feeCents = member ? calculateMemberFee(weeklyAmt) : 0;
                const netCents = member ? calculateNetPayout(calculateMemberGross(weeklyAmt), feeCents) : 0;

                if (winner == null) {
                  return (
                    <tr key={week.id} className="text-gray-400 dark:text-gray-600">
                      <td className="px-4 py-3 font-medium">Week {week.weekNumber}</td>
                      <td className="px-4 py-3">{formatDate(week.date)}</td>
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

                return (
                  <tr key={week.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      Week {week.weekNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(week.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        #{winner}
                      </span>
                      {member && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {member.nameAmharic}
                          {isExtraWheel && <span className="ml-1 text-blue-400">(extra)</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {member ? formatCurrency(netCents) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {week.payoutStatus === "COLLECTED" ? (
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
                      {week.payoutMethod ? METHOD_LABEL[week.payoutMethod] : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs max-w-xs truncate">
                      {week.payoutNotes ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <PayoutForm
                        weekId={week.id}
                        currentStatus={week.payoutStatus ?? "PENDING"}
                        currentMethod={week.payoutMethod ?? null}
                        currentNotes={week.payoutNotes ?? ""}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PayoutForm({
  weekId,
  currentStatus,
  currentMethod,
  currentNotes,
}: {
  weekId: string;
  currentStatus: string;
  currentMethod: string | null;
  currentNotes: string;
}) {
  return (
    <form
      action={async (fd: FormData) => {
        "use server";
        await updatePayoutRecord(weekId, {
          payoutStatus: fd.get("status") as "PENDING" | "COLLECTED",
          payoutMethod: (fd.get("method") as "CASH" | "ZELLE" | "BOTH") || null,
          payoutNotes: fd.get("notes") as string,
        });
      }}
      className="flex flex-col gap-1.5 min-w-52"
    >
      <div className="flex gap-1">
        <select
          name="status"
          defaultValue={currentStatus}
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 flex-1 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="PENDING">Pending</option>
          <option value="COLLECTED">Collected</option>
        </select>
        <select
          name="method"
          defaultValue={currentMethod ?? ""}
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 flex-1 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Method</option>
          <option value="CASH">Cash</option>
          <option value="ZELLE">Zelle</option>
          <option value="BOTH">Both</option>
        </select>
      </div>
      <div className="flex gap-1">
        <input
          name="notes"
          type="text"
          defaultValue={currentNotes}
          placeholder="Notes…"
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 flex-1 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap font-medium"
        >
          Save
        </button>
      </div>
    </form>
  );
}
