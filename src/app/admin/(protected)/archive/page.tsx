export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDate, formatCurrency, TOTAL_WEEKS } from "@/lib/equb";
import { DeleteArchiveButton } from "@/components/admin/DeleteArchiveButton";

type SnapshotSummary = {
  memberCount: number;
  weeklyPotCents: number;
  collectionsDone: number;
};

type SnapshotPayment = {
  status: string;
};

type SnapshotMember = {
  nameAmharic: string;
  nameEnglishFirst: string;
  weeklyAmount: number;
  wheelNumber: number;
  extraWheelNumber: number | null;
};

type Snapshot = {
  summary: SnapshotSummary;
  members: SnapshotMember[];
  payments: SnapshotPayment[];
};

export default async function ArchivePage() {
  const archives = await db.equbArchive.findMany({
    orderBy: { archivedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archive History</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          Completed Equb cycles — {archives.length} {archives.length === 1 ? "cycle" : "cycles"} on record
        </p>
      </div>

      {archives.length === 0 ? (
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-16 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <p className="font-semibold text-gray-500 dark:text-gray-400">No archived cycles yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
            When you end a completed Equb cycle from the dashboard, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {archives.map((archive) => {
            const snap = archive.snapshot as Snapshot;
            const summary = snap.summary;
            const members = snap.members ?? [];
            const payments = snap.payments ?? [];

            const paidCount = payments.filter((p) => p.status === "PAID").length;
            const lateCount = payments.filter((p) => p.status === "LATE").length;
            const deferredCount = payments.filter((p) => p.status === "DEFERRED").length;
            const pendingCount = payments.filter((p) => p.status === "PENDING").length;
            const totalPayments = payments.length;
            const paidPct = totalPayments > 0 ? Math.round((paidCount / totalPayments) * 100) : 0;

            const weeklyPot = summary.weeklyPotCents;
            const totalCollected = weeklyPot * TOTAL_WEEKS;

            return (
              <div
                key={archive.id}
                className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {archive.cycleNumber}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-base">
                        Cycle {archive.cycleNumber}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(archive.startDate)} — {formatDate(archive.endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-gray-600">
                      Archived {new Date(archive.archivedAt).toLocaleDateString("en-US")}
                    </span>
                    <DeleteArchiveButton archiveId={archive.id} cycleNumber={archive.cycleNumber} />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <ArchiveStat label="Members" value={String(summary.memberCount)} />
                  <ArchiveStat
                    label="Weekly Pot"
                    value={formatCurrency(weeklyPot)}
                    sub={`${formatCurrency(totalCollected)} total`}
                  />
                  <ArchiveStat
                    label="Collections"
                    value={`${summary.collectionsDone} / ${TOTAL_WEEKS}`}
                    sub="payouts confirmed"
                  />
                  <ArchiveStat
                    label="Payments Paid"
                    value={`${paidPct}%`}
                    sub={`${paidCount} of ${totalPayments}`}
                  />
                </div>

                {/* Payment breakdown bar */}
                {totalPayments > 0 && (
                  <div className="px-6 pb-5 space-y-2">
                    <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                      {paidCount > 0 && (
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${(paidCount / totalPayments) * 100}%` }}
                        />
                      )}
                      {lateCount > 0 && (
                        <div
                          className="bg-amber-500 h-full"
                          style={{ width: `${(lateCount / totalPayments) * 100}%` }}
                        />
                      )}
                      {deferredCount > 0 && (
                        <div
                          className="bg-orange-400 h-full"
                          style={{ width: `${(deferredCount / totalPayments) * 100}%` }}
                        />
                      )}
                      {pendingCount > 0 && (
                        <div
                          className="bg-gray-200 dark:bg-gray-700 h-full flex-1"
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      {paidCount > 0 && <span><span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-1" />{paidCount} paid</span>}
                      {lateCount > 0 && <span><span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-1" />{lateCount} late</span>}
                      {deferredCount > 0 && <span><span className="inline-block w-2 h-2 bg-orange-400 rounded-full mr-1" />{deferredCount} deferred</span>}
                      {pendingCount > 0 && <span><span className="inline-block w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mr-1" />{pendingCount} pending</span>}
                    </div>
                  </div>
                )}

                {/* Member list (collapsed summary) */}
                {members.length > 0 && (
                  <details className="border-t border-gray-100 dark:border-gray-800">
                    <summary className="px-6 py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 select-none list-none flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 transition-transform details-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      {members.length} members
                    </summary>
                    <div className="px-6 pb-4 pt-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            <th className="text-left pb-2">Name</th>
                            <th className="text-right pb-2">Wheel</th>
                            <th className="text-right pb-2">Weekly</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {members.map((m) => (
                            <tr key={m.wheelNumber}>
                              <td className="py-1.5 text-gray-800 dark:text-gray-200">{m.nameAmharic}</td>
                              <td className="py-1.5 text-right text-gray-500 dark:text-gray-400">
                                #{m.wheelNumber}{m.extraWheelNumber != null ? ` / #${m.extraWheelNumber}` : ""}
                              </td>
                              <td className="py-1.5 text-right font-semibold text-gray-800 dark:text-gray-200">
                                {formatCurrency(m.weeklyAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ArchiveStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}
