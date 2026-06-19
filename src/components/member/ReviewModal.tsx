"use client";

import { useEffect, useImperativeHandle, useState, useTransition, type Ref } from "react";
import { createPortal } from "react-dom";
import { submitReviewRequest } from "@/actions/reviews";

export interface EligibleWeek {
  id: string;
  weekNumber: number;
  date: string;
}

export interface ReviewModalHandle {
  open(): void;
}

const CLAIMED_OPTIONS = [
  { value: "CASH",   label: "I paid cash" },
  { value: "ZELLE",  label: "I paid via Zelle" },
  { value: "WON",    label: "I won that week (deduct from winnings)" },
  { value: "DOUBLE", label: "I paid two weeks at once" },
  { value: "OTHER",  label: "Other" },
  { value: "SKIP",   label: "I need to skip this week — financial hardship" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  });
}

// React 19: ref passed as a regular prop (no forwardRef needed).
export function ReviewModal({
  token,
  eligibleWeeks,
  ref,
}: {
  token: string;
  eligibleWeeks: EligibleWeek[];
  ref?: Ref<ReviewModalHandle>;
}) {
  const [mounted,      setMounted]      = useState(false);
  const [isOpen,       setIsOpen]       = useState(false);
  const [reviewKey,    setReviewKey]    = useState(0);
  const [reviewResult, setReviewResult] = useState<{ error?: string; success?: boolean }>({});
  const [isSubmitting, startSubmit]     = useTransition();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useImperativeHandle(ref, () => ({
    open() {
      setReviewResult({});
      setReviewKey((k) => k + 1);
      setIsOpen(true);
    },
  }));

  function closeReview() {
    setIsOpen(false);
    setTimeout(() => setReviewResult({}), 300);
  }

  function handleReviewSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSubmit(async () => {
      const result = await submitReviewRequest({}, formData);
      setReviewResult(result);
    });
  }

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
        onClick={closeReview}
      />
      <div
        className="relative w-full sm:max-w-md bg-white dark:bg-[#141414] rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-10 max-h-[90vh] flex flex-col"
        style={{ animation: "equb-slideInUp 200ms ease" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Request Payment Review</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Admin will review and update your record</p>
          </div>
          <button
            onClick={closeReview}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ touchAction: "manipulation" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          {reviewResult.success ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-white">Request submitted!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your request has been submitted. Admin will review it shortly.
              </p>
              <button
                type="button"
                onClick={closeReview}
                style={{ touchAction: "manipulation" }}
                className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form key={reviewKey} onSubmit={handleReviewSubmit} className="space-y-4">
              <input type="hidden" name="token" value={token} />

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Which week?
                </label>
                {eligibleWeeks.length === 0 ? (
                  <p className="text-sm text-gray-400 px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    No weeks are currently eligible for review.
                  </p>
                ) : (
                  <select
                    name="weekId"
                    required
                    style={{ fontSize: "16px" }}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select a week…</option>
                    {eligibleWeeks.map((w) => (
                      <option key={w.id} value={w.id}>
                        Week {w.weekNumber} — {fmtDate(w.date)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

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
                  {CLAIMED_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

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

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Any details for the admin…"
                  style={{ fontSize: "16px" }}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {reviewResult.error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">
                  {reviewResult.error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeReview}
                  style={{ touchAction: "manipulation" }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || eligibleWeeks.length === 0}
                  style={{ touchAction: "manipulation" }}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold transition-colors"
                >
                  {isSubmitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes equb-slideInUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>,
    document.body
  );
}
