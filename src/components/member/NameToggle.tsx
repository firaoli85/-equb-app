"use client";

import { useTransition } from "react";
import { updateDisplayPreference } from "@/actions/members";

const OPTIONS = [
  { pref: "AMHARIC" as const, label: "አማርኛ" },
  { pref: "ENGLISH" as const, label: "EN" },
];

export function NameToggle({
  token,
  current,
}: {
  token: string;
  current: "AMHARIC" | "ENGLISH";
}) {
  const [isPending, startTransition] = useTransition();

  function select(pref: "AMHARIC" | "ENGLISH") {
    if (pref === current) return;
    startTransition(() => {
      updateDisplayPreference(token, pref);
    });
  }

  return (
    <div
      className={`inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 gap-1 ${isPending ? "opacity-60" : ""}`}
    >
      {OPTIONS.map(({ pref, label }) => (
        <button
          key={pref}
          type="button"
          onClick={() => select(pref)}
          style={{ minHeight: "44px", minWidth: "44px", touchAction: "manipulation" }}
          className={`px-4 text-sm font-bold rounded-full transition-colors select-none ${
            current === pref
              ? "bg-emerald-600 text-white ring-1 ring-emerald-700/50 dark:ring-emerald-500/40"
              : "text-gray-500 dark:text-gray-400 active:bg-gray-200 dark:active:bg-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
