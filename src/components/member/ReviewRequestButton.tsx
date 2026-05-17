"use client";

import { useActionState, useState } from "react";
import { submitReviewRequest } from "@/actions/reviews";

const CLAIMED_STATUS_OPTIONS = [
  { value: "CASH",   label: "I paid cash" },
  { value: "ZELLE",  label: "I paid via Zelle" },
  { value: "WON",    label: "I won that week (deduct from winnings)" },
  { value: "DOUBLE", label: "I paid two weeks at once" },
  { value: "OTHER",  label: "Other" },
];

const initial = { error: undefined, success: false };

export function ReviewRequestButton({
  token,
  weekId,
  weekNumber,
  weekDate,
  existingStatus,
}: {
  token: string;
  weekId: string;
  weekNumber: number;
  weekDate: string;
  existingStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitReviewRequest, initial);

  if (state.success) {
    return (
      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        Submitted ✓
      </span>
    );
  }

  if (existingStatus === "PENDING") {
    return (
      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
        Review Pending
      </span>
    );
  }

  if (existingStatus === "APPROVED") {
    return (
      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        Approved ✓
      </span>
    );
  }

  if (existingStatus === "REJECTED") {
    return (
      <span className="text-xs text-red-500 dark:text-red-400 font-medium">
        Rejected
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ touchAction: "manipulation" }}
        className="text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 px-2 py-0.5 rounded-full transition-colors"
      >
        Request Review
      </button>

      {open && (
        /* ── Modal overlay ── */
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

          {/* Sheet */}
          <div className="relative w-full sm:max-w-md bg-white dark:bg-[#141414] rounded-t-2xl sm:rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-800 space-y-4 z-10">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Request Payment Review</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Week {weekNumber} · {weekDate}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <form action={action} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="weekId" value={weekId} />

              {/* What happened */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  What happened?
                </label>
                <select
                  name="claimedStatus"
                  required
                  style={{ fontSize: "16px" }}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select an option…</option>
                  {CLAIMED_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Date of payment */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Date of payment
                </label>
                <input
                  name="claimedDate"
                  type="date"
                  required
                  style={{ fontSize: "16px" }}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Additional notes <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Any extra details for the admin…"
                  style={{ fontSize: "16px" }}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {state.error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">
                  {state.error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  style={{ touchAction: "manipulation" }}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold transition-colors"
                >
                  {pending ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
