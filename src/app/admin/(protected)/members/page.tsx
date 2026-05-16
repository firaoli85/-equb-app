export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  calculateMemberFee,
  calculateMemberGross,
  calculateNetPayout,
  calculatePot,
  formatCurrency,
  formatDate,
} from "@/lib/equb";
import { MemberActions } from "@/components/admin/MemberActions";
import { CopyButton } from "@/components/ui/CopyButton";
import Link from "next/link";

export default async function MembersPage() {
  const [members, weeks, payments, winningWeeks] = await Promise.all([
    db.member.findMany({ orderBy: { wheelNumber: "asc" } }),
    db.week.findMany({ orderBy: { weekNumber: "asc" } }),
    db.payment.findMany(),
    db.week.findMany({
      where: { winnerWheelNumber: { not: null } },
      select: { winnerWheelNumber: true },
    }),
  ]);

  const potCents = calculatePot(members);
  const paidCountByMember = new Map<string, number>();
  for (const p of payments) {
    if (p.status === "PAID")
      paidCountByMember.set(p.memberId, (paidCountByMember.get(p.memberId) ?? 0) + 1);
  }
  const weekByNumber = new Map(weeks.map((w) => [w.weekNumber, w]));
  const drawnNumbers = new Set(winningWeeks.map((w) => w.winnerWheelNumber!));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Members</h1>
        <Link
          href="/admin/members/new"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Member
        </Link>
      </div>

      {/* Status legend */}
      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          Wheel suspended
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-600 inline-block" />
          Collected
        </span>
      </div>

      {members.length === 0 ? (
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-16 text-center">
          <p className="text-gray-400 mb-4">No members yet.</p>
          <Link
            href="/admin/members/new"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            Add first member
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Weekly</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Fee</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Net Payout</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Payout Week</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Doc 1</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Doc 2</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Link</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {members.map((m, i) => {
                  const fee = calculateMemberFee(m.weeklyAmount);
                  const net = calculateNetPayout(calculateMemberGross(m.weeklyAmount), fee);
                  const payoutWeek = weekByNumber.get(m.wheelNumber);
                  const paidCount = paidCountByMember.get(m.id) ?? 0;
                  const allPaid = paidCount === 20;

                  // Status: collected → gray, suspended → red, active → green
                  const hasCollected =
                    drawnNumbers.has(m.wheelNumber) ||
                    (m.extraWheelNumber !== null && drawnNumbers.has(m.extraWheelNumber));
                  const statusDotClass = hasCollected
                    ? "bg-gray-400 dark:bg-gray-600"
                    : m.wheelSuspended
                    ? "bg-red-500"
                    : "bg-emerald-500";

                  return (
                    <tr
                      key={m.id}
                      className={`transition-colors ${
                        i % 2 === 0
                          ? "bg-white dark:bg-[#141414]"
                          : "bg-gray-50/50 dark:bg-gray-900/20"
                      } hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10`}
                    >
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotClass}`} />
                          <span>
                            #{m.wheelNumber}
                            {m.extraWheelNumber && (
                              <span className="ml-1 text-blue-400 dark:text-blue-500">+#{m.extraWheelNumber}</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{m.nameAmharic}</span>
                          {m.wheelSuspended && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                              Suspended
                            </span>
                          )}
                        </div>
                        {m.nameEnglishFirst && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 font-normal mt-0.5">
                            {[m.nameEnglishFirst, m.nameEnglishLast].filter(Boolean).join(" ")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {m.phone || <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {formatCurrency(m.weeklyAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-500">
                        {formatCurrency(fee)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(net)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {payoutWeek
                          ? `Wk ${m.wheelNumber} · ${formatDate(payoutWeek.date)}`
                          : `Wk ${m.wheelNumber}`}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            allPaid
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {paidCount}/20
                        </span>
                      </td>
                      {/* Doc 1: Participation Agreement */}
                      <td className="px-4 py-3">
                        {m.confirmedAt ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Signed
                            </span>
                            <a href={`/api/receipt/${m.token}`} className="block text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                              Download PDF
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            Unsigned
                          </span>
                        )}
                      </td>
                      {/* Doc 2: Collection Receipt */}
                      <td className="px-4 py-3">
                        {m.collectionConfirmedAt ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Signed
                            </span>
                            <a href={`/api/collection-receipt/${m.token}`} className="block text-xs text-blue-600 dark:text-blue-400 hover:underline">
                              Download PDF
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/m/${m.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono"
                          >
                            /m/{m.token.slice(0, 6)}…
                          </a>
                          <CopyButton value={`/m/${m.token}`} label="Copy" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <MemberActions
                          memberId={m.id}
                          memberName={m.nameAmharic}
                          wheelSuspended={m.wheelSuspended}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-sm text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {formatCurrency(potCents)}
        </span>{" "}
        weekly pot across {members.length} member slots
      </div>
    </div>
  );
}
