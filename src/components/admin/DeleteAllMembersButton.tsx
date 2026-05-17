"use client";

import { useState, useTransition } from "react";
import { deleteAllMembers } from "@/actions/members";

export function DeleteAllMembersButton() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setConfirmText("");
  }

  function handleConfirm() {
    if (confirmText !== "DELETE") return;
    startTransition(async () => {
      await deleteAllMembers();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete All Members
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={close} />
          <div className="relative bg-white dark:bg-[#141414] rounded-2xl border border-red-200 dark:border-red-900 shadow-xl w-full max-w-md p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Delete All Members</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  This will permanently delete <span className="font-semibold text-gray-700 dark:text-gray-300">ALL members</span> and all their payment records, review requests, and audit logs.{" "}
                  <span className="font-semibold text-red-600 dark:text-red-400">This cannot be undone.</span>{" "}
                  Weeks data is preserved.
                </p>
              </div>
            </div>

            {/* Confirmation input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type <span className="font-black text-red-600 dark:text-red-400">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && confirmText === "DELETE") handleConfirm(); }}
                placeholder="DELETE"
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-mono tracking-widest"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirmText !== "DELETE" || isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
              >
                {isPending ? "Deleting…" : "Delete All Members"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
