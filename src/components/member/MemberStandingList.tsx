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

export function MemberStandingList({
  members,
  weeks,
  totalWeeks,
  token,
}: {
  members: MemberStanding[];
  weeks: SharedWeek[];
  totalWeeks: number;
  token: string;
}) {
  const [selectedMember, setSelectedMember] = useState<MemberStanding | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleTap(member: MemberStanding) {
    setSelectedMember(member);
    setSheetOpen(true);
    // Fire-and-forget — viewer token resolved server-side so client can't spoof it
    void logPeerView(token, member.id);
  }

  function handleClose() {
    setSheetOpen(false);
  }

  // Group alphabetically by first letter of English first name (already sorted from server)
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

  return (
    <>
      <div className="space-y-1">
        {/* Page header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">The group</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{members.length} members</p>
        </div>

        {groups.map((group) => (
          <div key={group.letter}>
            {/* Sticky letter header — sits just below the 64px fixed top nav */}
            <div className="sticky top-16 z-10 bg-[#F7F8FA] dark:bg-[#0a0a0b] py-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {group.letter}
              </span>
            </div>

            {/* Member card for this letter group */}
            <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#141414] border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 mb-4">
              {group.members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  totalWeeks={totalWeeks}
                  onTap={handleTap}
                />
              ))}
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
            No other members yet.
          </div>
        )}
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

function MemberRow({
  member,
  totalWeeks,
  onTap,
}: {
  member: MemberStanding;
  totalWeeks: number;
  onTap: (m: MemberStanding) => void;
}) {
  const onTrack = member.behindCount === 0;
  const initial = member.nameEnglishFirst[0]?.toUpperCase() ?? "?";
  const fullName = [member.nameEnglishFirst, member.nameEnglishLast]
    .filter(Boolean)
    .join(" ");

  const paidPct   = Math.min(100, (member.paidCount   / totalWeeks) * 100);
  const behindPct = Math.min(100 - paidPct, (member.behindCount / totalWeeks) * 100);

  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 active:bg-indigo-100/60 dark:active:bg-indigo-950/30 transition-colors text-left"
      style={{ minHeight: "56px", touchAction: "manipulation" }}
      onClick={() => onTap(member)}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0 select-none">
        {initial}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-snug">
          {fullName || member.nameAmharic}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5 leading-snug">
          {member.nameAmharic}
        </p>
      </div>

      {/* Standing */}
      <div className="shrink-0 flex flex-col items-end gap-1.5 min-w-[72px]">
        {/* Badge */}
        <div className="flex items-center gap-1">
          <span
            className={`text-sm font-bold tabular-nums ${
              onTrack
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {member.paidCount}/{totalWeeks}
          </span>
          <span className="leading-none inline-flex items-center" aria-hidden>
            {onTrack ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-500 dark:text-emerald-400">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="text-gray-400 dark:text-gray-500">
                <path d="M5 12h14"/>
              </svg>
            )}
          </span>
        </div>

        {/* Behind label */}
        {!onTrack && (
          <p className="text-[10px] font-medium text-red-500 dark:text-red-400 leading-none">
            {member.behindCount} behind
          </p>
        )}

        {/* Mini bar */}
        <div className="w-[72px] h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div className="bg-emerald-500 transition-none" style={{ width: `${paidPct}%` }} />
            <div className="bg-red-400 transition-none"   style={{ width: `${behindPct}%` }} />
          </div>
        </div>
      </div>
    </button>
  );
}
