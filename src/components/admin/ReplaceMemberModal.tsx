"use client";

import { useActionState, useState } from "react";
import { replaceMember } from "@/actions/members";

type State = { error?: string; success?: boolean };

export function ReplaceMemberModal({
  memberId,
  memberName,
  wheelNumber,
  weeklyAmountFormatted,
}: {
  memberId: string;
  memberName: string;
  wheelNumber: number;
  weeklyAmountFormatted: string;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = replaceMember.bind(null, memberId);
  const [state, formAction, isPending] = useActionState<State, FormData>(boundAction, {});

  if (state.success) {
    return (
      <button
        disabled
        className="text-xs text-emerald-500 font-semibold cursor-default"
      >
        Replaced ✓
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors font-medium"
      >
        Replace
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !isPending && setOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#141414] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Replace Member</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Replacing <span className="font-semibold text-gray-700 dark:text-gray-300">{memberName}</span> — Lucky #{wheelNumber}
              </p>
            </div>

            <form action={formAction} className="px-6 py-5 space-y-4">
              {/* Pre-filled read-only fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Lucky #</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    #{wheelNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Weekly</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    {weeklyAmountFormatted}
                  </p>
                </div>
              </div>

              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                The old member will be archived. All existing payment statuses will be copied to the new member.
              </p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Amharic name <span className="text-red-500">*</span>
                </label>
                <input
                  name="nameAmharic"
                  type="text"
                  required
                  autoFocus
                  style={{ fontSize: "16px" }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    English first name
                  </label>
                  <input
                    name="nameEnglishFirst"
                    type="text"
                    style={{ fontSize: "16px" }}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    English last name
                  </label>
                  <input
                    name="nameEnglishLast"
                    type="text"
                    style={{ fontSize: "16px" }}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  name="phone"
                  type="tel"
                  style={{ fontSize: "16px" }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm transition-colors"
                >
                  {isPending ? "Replacing…" : "Replace Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
