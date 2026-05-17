"use client";

import { useState, useTransition } from "react";
import { approveReview, rejectReview } from "@/actions/reviews";

export function ReviewActions({ requestId }: { requestId: string }) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  if (done) {
    return (
      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
        {done === "approved" ? "✓ Approved" : "✗ Rejected"}
      </p>
    );
  }

  return (
    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
      <input
        type="text"
        placeholder="Admin note (optional)…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await approveReview(requestId, note || null);
              setDone("approved");
            })
          }
          style={{ touchAction: "manipulation" }}
          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors"
        >
          {isPending ? "Saving…" : "Approve"}
        </button>
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await rejectReview(requestId, note || null);
              setDone("rejected");
            })
          }
          style={{ touchAction: "manipulation" }}
          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors"
        >
          {isPending ? "Saving…" : "Reject"}
        </button>
      </div>
    </div>
  );
}
