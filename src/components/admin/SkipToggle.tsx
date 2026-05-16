"use client";

import { useTransition } from "react";
import { toggleSkipWeek } from "@/actions/weeks";

export function SkipToggle({ weekId, isSkipped }: { weekId: string; isSkipped: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleSkipWeek(weekId);
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      role="switch"
      aria-checked={isSkipped}
      title={isSkipped ? "Un-skip this week" : "Skip this week"}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-[#141414] disabled:opacity-50 ${
        isSkipped
          ? "bg-red-400 dark:bg-red-600"
          : "bg-gray-200 dark:bg-gray-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          isSkipped ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
