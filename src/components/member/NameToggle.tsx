"use client";

import { useTransition } from "react";
import { updateDisplayPreference } from "@/actions/members";

export function NameToggle({
  token,
  current,
}: {
  token: string;
  current: "AMHARIC" | "ENGLISH";
}) {
  const [isPending, startTransition] = useTransition();

  function select(pref: "AMHARIC" | "ENGLISH") {
    if (pref === current || isPending) return;
    startTransition(async () => {
      await updateDisplayPreference(token, pref);
    });
  }

  return (
    <div
      className={`inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 gap-0.5 transition-opacity ${isPending ? "opacity-60" : ""}`}
      title="Switch name language"
    >
      <button
        onClick={() => select("AMHARIC")}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
          current === "AMHARIC"
            ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        }`}
      >
        አማርኛ
      </button>
      <button
        onClick={() => select("ENGLISH")}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
          current === "ENGLISH"
            ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        }`}
      >
        EN
      </button>
    </div>
  );
}
