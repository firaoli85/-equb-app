"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addWinnerToWeek } from "@/actions/collection";

type WeekOption = { id: string; weekNumber: number; date: string };

const SEL =
  "text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed";

const INP =
  "text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 w-24 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Feedback =
  | { kind: "success"; message: string }
  | { kind: "warning"; message: string }
  | { kind: "error"; message: string };

export function AddWinnerForm({ weeks }: { weeks: WeekOption[] }) {
  const router = useRouter();
  const [weekId, setWeekId] = useState("");
  const [numInput, setNumInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const num = parseInt(numInput, 10);

    if (!weekId) {
      setFeedback({ kind: "error", message: "Select a week." });
      return;
    }
    if (!numInput.trim() || isNaN(num) || num < 1) {
      setFeedback({ kind: "error", message: "Enter a valid lucky number (positive integer)." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await addWinnerToWeek(weekId, [num]);

      // Top-level error: unauthorized, week not found, etc.
      if (result.error) {
        setFeedback({ kind: "error", message: result.error });
        return;
      }

      // Number was skipped — global uniqueness guard triggered or other skip
      if (result.skipped.length > 0) {
        setFeedback({ kind: "error", message: result.skipped[0].reason });
        return;
      }

      // Number added but no member owns it — could be a typo
      if (result.warnings.length > 0) {
        setFeedback({
          kind: "warning",
          message: `${result.warnings[0]} — double-check the number.`,
        });
        router.refresh();
        return;
      }

      // Clean success
      const wk = weeks.find((w) => w.id === weekId);
      setFeedback({
        kind: "success",
        message: `Lucky #${num} added as winner on Week ${wk?.weekNumber ?? "?"}.`,
      });
      setNumInput("");
      router.refresh();
    });
  }

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Add Winner to Week
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Catch-up draws — manually assign a lucky number to a specific week.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Week</label>
          <select
            value={weekId}
            onChange={(e) => {
              setWeekId(e.target.value);
              setFeedback(null);
            }}
            disabled={isPending}
            className={SEL}
          >
            <option value="">Select week…</option>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                Week {w.weekNumber} · {shortDate(w.date)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Lucky #</label>
          <input
            type="number"
            min={1}
            step={1}
            value={numInput}
            onChange={(e) => {
              setNumInput(e.target.value);
              setFeedback(null);
            }}
            disabled={isPending}
            placeholder="e.g. 5"
            className={INP}
          />
        </div>

        <button
          type="submit"
          disabled={isPending || !weekId || !numInput}
          className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          {isPending ? "Adding…" : "Add winner"}
        </button>
      </form>

      {feedback && (
        <p
          className={`text-xs mt-3 font-medium ${
            feedback.kind === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : feedback.kind === "warning"
              ? "text-amber-600 dark:text-amber-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
