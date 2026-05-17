export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/equb";
import { ReviewActions } from "@/components/admin/ReviewActions";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: "Pending",  cls: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800" },
  APPROVED: { label: "Approved", cls: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" },
  REJECTED: { label: "Rejected", cls: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800" },
};

const CLAIMED_LABELS: Record<string, string> = {
  CASH:   "Paid cash",
  ZELLE:  "Paid via Zelle",
  WON:    "Won that week",
  DOUBLE: "Paid two weeks at once",
  OTHER:  "Other",
};

export default async function ReviewsPage() {
  const requests = await db.paymentReviewRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      member: { select: { nameAmharic: true, nameEnglishFirst: true, token: true } },
      week: { select: { weekNumber: true, date: true } },
    },
  });

  const pending = requests.filter((r) => r.status === "PENDING");
  const resolved = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Review Requests</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            Members requesting corrections to their payment records
          </p>
        </div>
        {pending.length > 0 && (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-sm font-bold border border-amber-200 dark:border-amber-800">
            {pending.length} pending
          </span>
        )}
      </div>

      {requests.length === 0 && (
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-16 text-center">
          <p className="text-gray-400 dark:text-gray-600">No review requests yet.</p>
        </div>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Pending Review
          </h2>
          {pending.map((r) => (
            <div key={r.id} className="bg-white dark:bg-[#141414] rounded-2xl border border-amber-200 dark:border-amber-800/60 shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {r.member.nameAmharic}
                    {r.member.nameEnglishFirst && (
                      <span className="ml-2 text-sm font-normal text-gray-400">({r.member.nameEnglishFirst})</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Week {r.week.weekNumber} · {formatDate(r.week.date)}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_LABELS[r.status]?.cls}`}>
                  {STATUS_LABELS[r.status]?.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">What they claim</p>
                  <p className="text-gray-700 dark:text-gray-300">{CLAIMED_LABELS[r.claimedStatus] ?? r.claimedStatus}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Date they paid</p>
                  <p className="text-gray-700 dark:text-gray-300">{formatDate(r.claimedDate)}</p>
                </div>
              </div>

              {r.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Notes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2">{r.notes}</p>
                </div>
              )}

              <p className="text-xs text-gray-400 dark:text-gray-600">
                Submitted {new Date(r.createdAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC
              </p>

              <ReviewActions requestId={r.id} />
            </div>
          ))}
        </section>
      )}

      {/* Resolved requests */}
      {resolved.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Resolved
          </h2>
          {resolved.map((r) => (
            <div key={r.id} className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-2 opacity-75">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {r.member.nameAmharic}
                    {r.member.nameEnglishFirst && (
                      <span className="ml-2 text-sm font-normal text-gray-400">({r.member.nameEnglishFirst})</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Week {r.week.weekNumber} · {CLAIMED_LABELS[r.claimedStatus] ?? r.claimedStatus}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_LABELS[r.status]?.cls}`}>
                  {STATUS_LABELS[r.status]?.label}
                </span>
              </div>
              {r.adminNote && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">Admin note: {r.adminNote}</p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
