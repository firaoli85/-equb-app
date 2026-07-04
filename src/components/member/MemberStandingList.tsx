"use client";

import { useState } from "react";
import { logPeerView } from "@/actions/peer-view";
import { PeerDetailSheet } from "@/components/member/PeerDetailSheet";

export type WeekPayment = {
  weekNumber: number;
  status: string;
};

export type SharedWeek = {
  id: string;
  weekNumber: number;
  date: string;
};

export type MemberStanding = {
  id: string;
  nameAmharic: string;
  nameEnglishFirst: string;
  nameEnglishLast: string;
  paidCount: number;
  behindCount: number;
  weekPayments: WeekPayment[];
};

// ── Status pills — same bordered-pill DNA as MemberPayoutCard draw-state pills ──

function CurrentPill() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900">
      <svg
        className="w-3 h-3 shrink-0"
        fill="none"
        viewBox="0 0 12 12"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
      </svg>
      Current
    </span>
  );
}

function BehindPill({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 tabular-nums text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900">
      {count} behind
    </span>
  );
}

// ── Main list ─────────────────────────────────────────────────────────────────

export function MemberStandingList({
  members,
  weeks,
  totalWeeks,
  token,
  currentCount,
  totalCount,
  viewerDisplayName,
  viewerPaidCount,
  viewerBehindCount,
  currentWeekNum,
}: {
  members: MemberStanding[];
  weeks: SharedWeek[];
  totalWeeks: number;
  token: string;
  currentCount: number;
  totalCount: number;
  viewerDisplayName: string;
  viewerPaidCount: number;
  viewerBehindCount: number;
  currentWeekNum: number;
}) {
  const [selectedMember, setSelectedMember] = useState<MemberStanding | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleTap(member: MemberStanding) {
    setSelectedMember(member);
    setSheetOpen(true);
    void logPeerView(token, member.id);
  }

  function handleClose() {
    setSheetOpen(false);
  }

  // Group alphabetically by first letter of English first name (already sorted)
  type Group = { letter: string; members: MemberStanding[] };
  const groups: Group[] = [];
  for (const m of members) {
    const letter = m.nameEnglishFirst[0]?.toUpperCase() ?? "#";
    if (groups.length === 0 || groups[groups.length - 1].letter !== letter) {
      groups.push({ letter, members: [m] });
    } else {
      groups[groups.length - 1].members.push(m);
    }
  }

  const viewerInitial = ([...viewerDisplayName][0] ?? "?").toUpperCase();
  const viewerOnTrack = viewerBehindCount === 0;
  const viewerPaidPct =
    totalWeeks > 0 ? Math.min((viewerPaidCount / totalWeeks) * 100, 100) : 0;

  return (
    <>
      <div className="space-y-4">

        {/* ── Summary header ────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white text-balance">
              The group
            </h1>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
              {totalCount} members · Week {currentWeekNum} of {totalWeeks}
            </p>
          </div>

          {/* Key metric — current count */}
          <div className="text-right shrink-0 pt-0.5">
            <p className="text-2xl font-black tabular-nums leading-none text-emerald-600 dark:text-emerald-400">
              {currentCount}/{totalCount}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-emerald-600/70 dark:text-emerald-400/70">
              current this week
            </p>
          </div>
        </div>

        {/* ── Your own row — pinned, accent-tinted card ─────────────── */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 px-4 pt-3.5 pb-3.5">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full bg-indigo-200/80 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0 select-none"
              aria-hidden="true"
            >
              {viewerInitial}
            </div>

            {/* Name + count */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug text-gray-900 dark:text-white truncate">
                <span className="text-indigo-500 dark:text-indigo-400">You</span>
                <span className="text-gray-300 dark:text-gray-600 mx-1.5" aria-hidden="true">·</span>
                {viewerDisplayName}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
                {viewerPaidCount} of {totalWeeks} weeks paid
              </p>
            </div>

            {/* Status pill */}
            {viewerOnTrack ? <CurrentPill /> : <BehindPill count={viewerBehindCount} />}
          </div>

          {/* Progress bar — viewer only */}
          <div
            className="mt-3 h-1 rounded-full overflow-hidden bg-indigo-100 dark:bg-indigo-900/50"
            role="progressbar"
            aria-valuenow={viewerPaidCount}
            aria-valuemin={0}
            aria-valuemax={totalWeeks}
            aria-label={`${viewerPaidCount} of ${totalWeeks} weeks paid`}
          >
            <div
              className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
              style={{ width: `${viewerPaidPct}%` }}
            />
          </div>
        </div>

        {/* ── Everyone else — single card, divide-y ─────────────────── */}
        {members.length > 0 && (() => {
          let globalIdx = 0;
          return (
            <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#141414] border border-gray-100 dark:border-gray-800 shadow-sm">
              {groups.map((group, gi) => (
                <div key={group.letter}>
                  {/* Letter divider — quiet, inside the card */}
                  <div
                    className={[
                      "px-4 py-2 bg-gray-50/70 dark:bg-white/[0.02]",
                      gi > 0 ? "border-t border-gray-100 dark:border-gray-800" : "",
                    ].join(" ")}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 dark:text-indigo-500">
                      {group.letter}
                    </span>
                  </div>

                  {/* Member rows */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {group.members.map((m) => {
                      const idx = globalIdx++;
                      return (
                        <MemberRow
                          key={m.id}
                          member={m}
                          totalWeeks={totalWeeks}
                          onTap={handleTap}
                          animDelay={idx < 9 ? idx * 0.07 : undefined}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {members.length === 0 && (
          <p className="text-center py-10 text-sm text-gray-400 dark:text-gray-600">
            No other members yet.
          </p>
        )}

        {/* ── Privacy notice ────────────────────────────────────────── */}
        <p className="text-center text-[11px] text-gray-400 dark:text-gray-600 leading-relaxed px-2">
          Payment progress is shared for accountability. Amounts, lucky numbers, and payouts stay private.
        </p>

      </div>

      <PeerDetailSheet
        member={selectedMember}
        weeks={weeks}
        token={token}
        isOpen={sheetOpen}
        onClose={handleClose}
      />
    </>
  );
}

// ── Peer row — name + paid count + status only, no amounts or lucky numbers ───

function MemberRow({
  member,
  totalWeeks,
  onTap,
  animDelay,
}: {
  member: MemberStanding;
  totalWeeks: number;
  onTap: (m: MemberStanding) => void;
  animDelay?: number;
}) {
  const onTrack = member.behindCount === 0;
  const initial = (
    member.nameEnglishFirst[0] ?? member.nameAmharic[0] ?? "?"
  ).toUpperCase();
  const fullName = [member.nameEnglishFirst, member.nameEnglishLast]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 active:bg-indigo-100/60 dark:active:bg-indigo-950/30 transition-colors text-left${animDelay !== undefined ? " animate-fade-in-up" : ""}`}
      style={animDelay !== undefined ? { minHeight: "56px", touchAction: "manipulation", animationDelay: `${animDelay}s` } : { minHeight: "56px", touchAction: "manipulation" }}
      onClick={() => onTap(member)}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0 select-none">
        {initial}
      </div>

      {/* Name + paid count */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-snug">
          {fullName || member.nameAmharic}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5 tabular-nums leading-snug">
          {member.paidCount}/{totalWeeks} paid
        </p>
      </div>

      {/* Status pill — current or behind. No star, no amounts, no lucky numbers. */}
      {onTrack ? <CurrentPill /> : <BehindPill count={member.behindCount} />}
    </button>
  );
}
