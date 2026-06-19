"use client";

import { useState, useTransition, useEffect } from "react";
import { updatePayoutRecord } from "@/actions/collection";
import type { PayoutMethod } from "@prisma/client";

const SELECT_CLS =
  "text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 flex-1 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed";

const INPUT_CLS =
  "text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 flex-1 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed";

function formatSignedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PayoutForm({
  weekPayoutId,
  currentStatus,
  currentMethod,
  currentNotes,
  signedAt,
}: {
  weekPayoutId: string;
  currentStatus: string;
  currentMethod: string | null;
  currentNotes: string;
  signedAt: string | null;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [method, setMethod] = useState(currentMethod ?? "");
  const [notes,  setNotes]  = useState(currentNotes);

  useEffect(() => { setStatus(currentStatus);      }, [currentStatus]);
  useEffect(() => { setMethod(currentMethod ?? ""); }, [currentMethod]);
  useEffect(() => { setNotes(currentNotes);         }, [currentNotes]);

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<"saved" | "error" | string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;

    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await updatePayoutRecord(weekPayoutId, {
          status: status as "PENDING" | "COLLECTED",
          method: (method as PayoutMethod) || null,
          notes,
        });
        if (result?.error) {
          setFeedback(result.error);
          return;
        }
        setFeedback("saved");
        setTimeout(() => setFeedback(null), 2500);
      } catch {
        setFeedback("error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 min-w-52">
      {/* Informational signed badge — member attested; move/remove will be blocked,
          but bookkeeping (status/method/notes) stays fully editable */}
      {signedAt !== null && (
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">
            Signed {formatSignedDate(signedAt)}
          </span>
        </div>
      )}

      <div className="flex gap-1">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={isPending}
          className={SELECT_CLS}
        >
          <option value="PENDING">Pending</option>
          <option value="COLLECTED">Collected</option>
        </select>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          disabled={isPending}
          className={SELECT_CLS}
        >
          <option value="">Method</option>
          <option value="CASH">Cash</option>
          <option value="ZELLE">Zelle</option>
          <option value="BOTH">Both</option>
        </select>
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
          placeholder="Notes…"
          className={INPUT_CLS}
        />
        <button
          type="submit"
          disabled={isPending}
          className="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap font-medium min-w-[52px]"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
      {feedback === "saved" && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          Saved ✓
        </p>
      )}
      {feedback === "error" && (
        <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
          Couldn&apos;t save — try again
        </p>
      )}
      {feedback && feedback !== "saved" && feedback !== "error" && (
        <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
          {feedback}
        </p>
      )}
    </form>
  );
}
