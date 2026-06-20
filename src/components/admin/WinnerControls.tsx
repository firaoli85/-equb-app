"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeWinner, moveWinner } from "@/actions/collection";

type WeekOption = { id: string; weekNumber: number };
type Mode = "idle" | "removeConfirm" | "moveSelect";

const LOCK_ICON = (
  <svg
    className="w-3 h-3 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const BTN_CANCEL =
  "text-[10px] font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 px-1.5 py-0.5 rounded transition-colors";

export function WinnerControls({
  weekPayoutId,
  weekNumber,
  payoutNumber,
  status,
  signedAt,
  currentWeekId,
  allWeeks,
}: {
  weekPayoutId: string;
  weekNumber: number;
  payoutNumber: number;
  status: string;
  signedAt: string | null;
  currentWeekId: string;
  allWeeks: WeekOption[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, startRemove] = useTransition();
  const [isMoving, startMove] = useTransition();

  const isActionable = status === "PENDING" && signedAt === null;

  // Locked row — show why move/remove are absent, but no buttons
  if (!isActionable) {
    if (status === "COLLECTED") {
      return (
        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800/60 text-gray-400 dark:text-gray-500">
          {LOCK_ICON}
          <span className="text-[10px] font-semibold">Collected · locked</span>
        </div>
      );
    }
    // Signed + pending: the signed badge in PayoutForm already explains the lock.
    return null;
  }

  // ── Action handlers ─────────────────────────────────────────────────────────

  function reset() {
    setMode("idle");
    setSelectedWeekId("");
    setError(null);
  }

  function handleRemove() {
    setError(null);
    startRemove(async () => {
      const result = await removeWinner(weekPayoutId);
      if (result.error) {
        setError(result.error);
        setMode("idle");
      } else {
        router.refresh();
      }
    });
  }

  function handleMove() {
    if (!selectedWeekId) return;
    setError(null);
    startMove(async () => {
      const result = await moveWinner(weekPayoutId, selectedWeekId);
      if (result.error) {
        setError(result.error);
        setMode("idle");
        setSelectedWeekId("");
      } else {
        router.refresh();
      }
    });
  }

  const otherWeeks = allWeeks
    .filter((w) => w.id !== currentWeekId)
    .sort((a, b) => a.weekNumber - b.weekNumber);

  return (
    <div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800/60 space-y-1.5">
      {/* ── Idle: Move + Remove buttons ── */}
      {mode === "idle" && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("moveSelect")}
            className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 px-1.5 py-0.5 rounded transition-colors"
          >
            Move
          </button>
          <button
            type="button"
            onClick={() => setMode("removeConfirm")}
            className="text-[10px] font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 hover:bg-red-50 dark:hover:bg-red-950/30 px-1.5 py-0.5 rounded transition-colors"
          >
            Remove
          </button>
        </div>
      )}

      {/* ── Remove: confirmation step ── */}
      {mode === "removeConfirm" && (
        <div className="space-y-1">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-snug">
            Remove{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              #{payoutNumber}
            </span>{" "}
            from Week {weekNumber}?{" "}
            <span className="text-gray-400 dark:text-gray-500">
              It can be drawn again.
            </span>
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleRemove}
              disabled={isRemoving}
              className="text-[10px] font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed px-1.5 py-0.5 rounded transition-colors"
            >
              {isRemoving ? "Removing…" : "Yes, remove"}
            </button>
            <button type="button" onClick={reset} className={BTN_CANCEL}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Move: week picker ── */}
      {mode === "moveSelect" && (
        <div className="space-y-1">
          <select
            value={selectedWeekId}
            onChange={(e) => setSelectedWeekId(e.target.value)}
            className="text-[10px] border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
          >
            <option value="">Move to week…</option>
            {otherWeeks.map((w) => (
              <option key={w.id} value={w.id}>
                Week {w.weekNumber}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleMove}
              disabled={!selectedWeekId || isMoving}
              className="text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed px-1.5 py-0.5 rounded transition-colors"
            >
              {isMoving ? "Moving…" : "Move here"}
            </button>
            <button type="button" onClick={reset} className={BTN_CANCEL}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline error — shown after either action fails */}
      {error && (
        <p className="text-[10px] text-red-600 dark:text-red-400 font-medium leading-snug">
          {error}
        </p>
      )}
    </div>
  );
}
