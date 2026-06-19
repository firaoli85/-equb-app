"use client";

import { useState, useTransition, useEffect } from "react";
import { updatePayoutRecord } from "@/actions/collection";
import type { PayoutMethod } from "@prisma/client";

const SELECT_CLS =
  "text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 flex-1 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed";

const INPUT_CLS =
  "text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 flex-1 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed";

export function PayoutForm({
  weekPayoutId,
  currentStatus,
  currentMethod,
  currentNotes,
}: {
  weekPayoutId: string;
  currentStatus: string;
  currentMethod: string | null;
  currentNotes: string;
}) {
  // Controlled state initialised from DB-backed props
  const [status, setStatus]   = useState(currentStatus);
  const [method, setMethod]   = useState(currentMethod ?? "");
  const [notes,  setNotes]    = useState(currentNotes);

  // Sync to server-revalidated props so the selects show the committed value after Save
  useEffect(() => { setStatus(currentStatus);     }, [currentStatus]);
  useEffect(() => { setMethod(currentMethod ?? ""); }, [currentMethod]);
  useEffect(() => { setNotes(currentNotes);        }, [currentNotes]);

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return; // idempotency guard — prevents double-submit even if button click races

    setFeedback(null);
    startTransition(async () => {
      try {
        await updatePayoutRecord(weekPayoutId, {
          status: status as "PENDING" | "COLLECTED",
          method: (method as PayoutMethod) || null,
          notes,
        });
        setFeedback("saved");
        setTimeout(() => setFeedback(null), 2500);
      } catch {
        setFeedback("error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 min-w-52">
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
    </form>
  );
}
