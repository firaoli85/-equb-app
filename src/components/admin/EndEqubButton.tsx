"use client";

import { useActionState, useState } from "react";
import { endEqub } from "@/actions/equb";

const INITIAL = { error: undefined as string | undefined, success: undefined as boolean | undefined };

export function EndEqubButton({ cycleNumber }: { cycleNumber: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(endEqub, INITIAL);

  if (state.success) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Equb archived successfully</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">New cycle is ready. Reload to see the updated dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        End Equb & Start New Cycle
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !isPending && setOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#141414] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-950 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">End Equb Cycle {cycleNumber}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <form action={formAction} className="px-6 py-5 space-y-4">
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>This will:</p>
                <ul className="space-y-1 pl-4">
                  {[
                    "Archive all current payment data, week results, and collection records",
                    "Reset all payment statuses to Pending for the new cycle",
                    "Clear all collection confirmations and spin wheel results",
                    "Keep all members, their tokens, and their agreement signatures",
                    "Clear the audit log (history is preserved in the archive)",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  New cycle start date
                </label>
                <input
                  type="date"
                  name="newStartDate"
                  required
                  style={{ fontSize: "16px" }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-sm transition-colors"
                >
                  {isPending ? "Archiving…" : "End Equb"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
