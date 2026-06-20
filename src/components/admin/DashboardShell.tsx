"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SpinWheel } from "@/components/admin/SpinWheel";
import { LockedMembersPanel } from "@/components/admin/LockedMembersPanel";
import { EndEqubButton } from "@/components/admin/EndEqubButton";

const STORAGE_KEY = "equb_dashboard_mode";

interface WheelSlotData { position: number; numbers: number[] }
interface WeekOption { id: string; weekNumber: number; date: string }
interface LockedMember {
  id: string;
  nameAmharic: string;
  nameEnglishFirst: string;
  phone: string | null;
  pinLockedUntil: string;
}

export function DashboardShell({
  pendingReviews,
  lockedMembers,
  archiveCount,
  collectionsDone,
  totalWeeks,
  slots,
  availableNumbers,
  weekOptions,
  currentWeekNum,
  currentWeekDate,
  weeksRemaining,
}: {
  pendingReviews: number;
  lockedMembers: LockedMember[];
  archiveCount: number;
  collectionsDone: number;
  totalWeeks: number;
  slots: WheelSlotData[];
  availableNumbers: number[];
  weekOptions: WeekOption[];
  currentWeekNum: number;
  currentWeekDate: string | null;
  weeksRemaining: number;
}) {
  const [mode, setMode] = useState<"admin" | "share">("admin");
  const [toggleReady, setToggleReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "share") setMode("share");
    } catch {}
    setToggleReady(true);
  }, []);

  function setAndPersist(next: "admin" | "share") {
    setMode(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }

  const isAdmin = mode === "admin";
  const allComplete = collectionsDone >= totalWeeks;

  const weekHeading =
    currentWeekNum > 0 ? `Week ${currentWeekNum} of ${totalWeeks}` : "Not started";
  const weekSub = (() => {
    const parts: string[] = [];
    if (currentWeekNum > 0)
      parts.push(`${weeksRemaining} week${weeksRemaining !== 1 ? "s" : ""} remaining`);
    if (currentWeekDate) parts.push(currentWeekDate);
    return parts.join(" · ");
  })();

  return (
    <div className="space-y-4">

      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">

        {/* Left: week info */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {weekHeading}
          </h1>
          {weekSub && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{weekSub}</p>
          )}
        </div>

        {/* Right: reviews badge + toggle — client-only, gated on toggleReady */}
        <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
          {toggleReady && isAdmin && pendingReviews > 0 && (
            <Link
              href="/admin/reviews"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/70 transition-colors whitespace-nowrap"
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black leading-none">
                {pendingReviews > 9 ? "9+" : pendingReviews}
              </span>
              {pendingReviews} review{pendingReviews !== 1 ? "s" : ""} waiting
            </Link>
          )}

          {/* Mode toggle — only renders after mount to avoid hydration mismatch */}
          {toggleReady && (
            <div className="flex items-center rounded-full p-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setAndPersist("admin")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 ${
                  isAdmin
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => setAndPersist("share")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 ${
                  !isAdmin
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                Share
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Share-mode banner — prominent, only in share mode ────────────────── */}
      {toggleReady && !isAdmin && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Share mode&nbsp;&mdash; safe to screen-share &middot; admin info hidden
          </p>
        </div>
      )}

      {/* ── PIN-locked members — admin only ──────────────────────────────────── */}
      {toggleReady && isAdmin && lockedMembers.length > 0 && (
        <LockedMembersPanel initialLocked={lockedMembers} />
      )}

      {/* ── SpinWheel — always visible; centered + breathing room in share mode ─ */}
      <div className={toggleReady && !isAdmin ? "mx-auto max-w-2xl w-full" : ""}>
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <SpinWheel
            key={availableNumbers.join("-")}
            slots={slots}
            availableNumbers={availableNumbers}
            weekOptions={weekOptions}
          />
        </div>
      </div>

      {/* ── End-of-Equb — admin only ─────────────────────────────────────────── */}
      {toggleReady && isAdmin && allComplete && (
        <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-800/60 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">
                All {totalWeeks} Collections Complete
              </h2>
              <p className="text-sm text-red-600 dark:text-red-400 max-w-md">
                Every member has collected their payout. Archive this cycle and begin a new one.
              </p>
            </div>
            <EndEqubButton cycleNumber={archiveCount + 1} />
          </div>
        </div>
      )}

    </div>
  );
}
