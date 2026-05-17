"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 60_000;

export function AutoRefresh() {
  const router = useRouter();
  const [secondsAgo, setSecondsAgo] = useState(0);

  const doRefresh = useCallback(() => {
    router.refresh();
    setSecondsAgo(0);
  }, [router]);

  useEffect(() => {
    const ticker = setInterval(() => setSecondsAgo((s) => s + 1), 1000);

    const refresher = setInterval(() => {
      if (document.visibilityState === "visible") doRefresh();
    }, INTERVAL_MS);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") doRefresh();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(ticker);
      clearInterval(refresher);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [doRefresh]);

  const label =
    secondsAgo === 0
      ? "Just updated"
      : secondsAgo < 60
      ? `Updated ${secondsAgo}s ago`
      : `Updated ${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <div className="px-5 py-2.5 border-t border-gray-50 dark:border-gray-800/60 flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500 animate-pulse shrink-0" />
      <span className="text-xs text-gray-400 dark:text-gray-600">{label}</span>
    </div>
  );
}
