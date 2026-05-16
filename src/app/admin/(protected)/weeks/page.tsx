export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { calculatePot, formatCurrency, formatDate } from "@/lib/equb";
import { updateWeekNotes } from "@/actions/weeks";
import { SkipToggle } from "@/components/admin/SkipToggle";

export default async function WeeksPage() {
  const [members, weeks, payments] = await Promise.all([
    db.member.findMany(),
    db.week.findMany({ orderBy: { weekNumber: "asc" } }),
    db.payment.findMany({ include: { member: true } }),
  ]);

  const potCents = calculatePot(members);

  const paymentsByWeek = new Map<string, typeof payments>();
  for (const p of payments) {
    const list = paymentsByWeek.get(p.weekId) ?? [];
    list.push(p);
    paymentsByWeek.set(p.weekId, list);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weeks</h1>

      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Week</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Expected</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Collected</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider min-w-36">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Skip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {weeks.map((week) => {
                const weekPayments = paymentsByWeek.get(week.id) ?? [];
                const collected = weekPayments
                  .filter((p) => p.status === "PAID")
                  .reduce((sum, p) => sum + p.member.weeklyAmount, 0);
                const pct = potCents > 0 ? Math.round((collected / potCents) * 100) : 0;

                return (
                  <tr
                    key={week.id}
                    className={`transition-colors ${
                      week.isSkipped
                        ? "opacity-50 bg-red-50/50 dark:bg-red-950/10"
                        : "hover:bg-gray-50/60 dark:hover:bg-gray-800/20"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {week.isSkipped ? (
                        <span className="line-through text-gray-400 dark:text-gray-600">
                          Week {week.weekNumber}
                        </span>
                      ) : (
                        <span>Week {week.weekNumber}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(week.date)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                      {formatCurrency(potCents)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(collected)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 min-w-16">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <form
                        action={async (fd: FormData) => {
                          "use server";
                          await updateWeekNotes(week.id, fd.get("notes") as string);
                        }}
                        className="flex gap-1"
                      >
                        <input
                          name="notes"
                          type="text"
                          defaultValue={week.notes ?? ""}
                          className="text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg w-36 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                          placeholder="Add note…"
                        />
                        <button
                          type="submit"
                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 px-1.5 transition-colors"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <SkipToggle weekId={week.id} isSkipped={week.isSkipped} />
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
