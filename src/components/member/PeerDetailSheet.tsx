"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WeekStampList, type StampWeek } from "@/components/member/WeekStampList";
import type { MemberStanding, SharedWeek } from "@/components/member/MemberStandingList";

// Build the StampWeek[] WeekStampList expects from the shared week list
// and one member's per-weekNumber statuses.
// isMainPayoutWeek / isExtraPayoutWeek are always false — we never expose
// another member's payout timing in the peer view.
function buildStampWeeks(
  weeks: SharedWeek[],
  weekPayments: MemberStanding["weekPayments"]
): StampWeek[] {
  const statusMap = new Map(weekPayments.map((p) => [p.weekNumber, p.status]));
  return weeks.map((w) => ({
    id: w.id,
    weekNumber: w.weekNumber,
    date: w.date,
    status: (statusMap.get(w.weekNumber) ?? "PENDING") as StampWeek["status"],
    isMainPayoutWeek: false,
    isExtraPayoutWeek: false,
  }));
}

export function PeerDetailSheet({
  member,
  weeks,
  token,
  isOpen,
  onClose,
}: {
  member: MemberStanding | null;
  weeks: SharedWeek[];
  /** Viewer's member token — used to scope the "once per login" animation flag. */
  token: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!mounted || !isOpen || !member) return null;

  const stampWeeks = buildStampWeeks(weeks, member.weekPayments);
  const fullName = [member.nameEnglishFirst, member.nameEnglishLast]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-md bg-white dark:bg-[#141414] rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-10 max-h-[85vh] flex flex-col"
        style={{ animation: "equb-slideInUp 200ms ease" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
              {fullName || member.nameAmharic}
            </h3>
            {fullName && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {member.nameAmharic}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ touchAction: "manipulation" }}
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Week tally — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/*
            key={member.id} mounts a fresh WeekStampList per member so the
            fill+mark animation always starts from scratch.
            Weeks only: no amounts, no lucky numbers, no payout labels.
          */}
          <WeekStampList key={member.id} weeks={stampWeeks} sessionKey={token} />
        </div>
      </div>

      <style>{`
        @keyframes equb-slideInUp {
          from { transform: translateY(40px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
      `}</style>
    </div>,
    document.body
  );
}
