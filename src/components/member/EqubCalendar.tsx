"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { motionTokens } from "@/lib/motion-tokens";

export type CalendarWeek = {
  weekNumber: number;
  date: string; // YYYY-MM-DD (UTC)
  status: "PAID" | "LATE" | "DEFERRED" | "PARTIAL" | "PENDING";
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAY_HEADS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const STATUS_CELL: Record<CalendarWeek["status"], string> = {
  PAID:     "bg-emerald-500 dark:bg-emerald-600 text-white",
  LATE:     "bg-red-500 dark:bg-red-600 text-white",
  DEFERRED: "bg-orange-500 dark:bg-orange-600 text-white",
  PARTIAL:  "bg-amber-500 dark:bg-amber-600 text-white",
  PENDING:  "ring-2 ring-inset ring-indigo-400 dark:ring-indigo-500 text-indigo-700 dark:text-indigo-400",
};

const STATUS_DOT: Record<CalendarWeek["status"], string> = {
  PAID:     "bg-emerald-500",
  LATE:     "bg-red-500",
  DEFERRED: "bg-orange-500",
  PARTIAL:  "bg-amber-500",
  PENDING:  "bg-indigo-400",
};

const LEGEND = [
  { key: "PENDING"  as const, label: "Upcoming" },
  { key: "PAID"     as const, label: "Paid"     },
  { key: "PARTIAL"  as const, label: "Partial"  },
  { key: "LATE"     as const, label: "Late"     },
  { key: "DEFERRED" as const, label: "Deferred" },
];

export function EqubCalendar({
  weeks,
  defaultMonth,
}: {
  weeks: CalendarWeek[];
  defaultMonth: string; // "YYYY-MM"
}) {
  const [displayMonth, setDisplayMonth] = useState(defaultMonth);
  const [direction, setDirection] = useState(0);
  const reduce = useReducedMotion();

  const [yearStr, monthStr] = displayMonth.split("-");
  const year     = parseInt(yearStr,  10);
  const month1   = parseInt(monthStr, 10); // 1-indexed
  const monthIdx = month1 - 1;             // 0-indexed for Date API

  // Date → status lookup
  const dateStatus  = new Map<string, CalendarWeek["status"]>();
  const dateWeekNum = new Map<string, number>();
  for (const w of weeks) {
    dateStatus.set(w.date, w.status);
    dateWeekNum.set(w.date, w.weekNumber);
  }

  // Sunday-start calendar grid using UTC to avoid timezone shifts
  const firstDow  = new Date(Date.UTC(year, monthIdx, 1)).getUTCDay(); // 0=Sun
  const totalDays = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const todayStr = new Date().toISOString().slice(0, 10);

  function shiftMonth(delta: number) {
    setDirection(delta);
    const d = new Date(Date.UTC(year, monthIdx + delta, 1));
    setDisplayMonth(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    );
  }

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm animate-fade-in-up-2">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => shiftMonth(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
          style={{ transitionProperty: "color, background-color, transform", transitionDuration: "150ms, 150ms, 100ms", transitionTimingFunction: "ease-out" }}
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {MONTH_NAMES[monthIdx]} {year}
        </p>
        <button
          onClick={() => shiftMonth(1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
          style={{ transitionProperty: "color, background-color, transform", transitionDuration: "150ms, 150ms, 100ms", transitionTimingFunction: "ease-out" }}
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers (static — don't cross-fade) */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-600 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells + Legend — cross-fade on month change */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={displayMonth}
          initial={{ opacity: 0, x: reduce ? 0 : direction * motionTokens.distance.sm }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: reduce ? 0 : -direction * motionTokens.distance.sm }}
          transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
        >
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;

              const dateStr = `${year}-${String(month1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const status  = dateStatus.get(dateStr);
              const weekNum = dateWeekNum.get(dateStr);
              const isEqub  = status !== undefined;
              const isToday = dateStr === todayStr;

              const cellCls = isEqub
                ? STATUS_CELL[status]
                : isToday
                ? "ring-1 ring-inset ring-gray-300 dark:ring-gray-600 text-gray-700 dark:text-gray-300"
                : "text-gray-400 dark:text-gray-600";

              const statusLabel = status === "PAID" ? "Paid" : status === "LATE" ? "Late" : status === "DEFERRED" ? "Deferred" : status === "PARTIAL" ? "Partial" : "Upcoming";

              return (
                <div key={day} className="flex items-center justify-center py-0.5">
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-bold select-none ${cellCls}`}
                    title={isEqub && weekNum != null ? `Week ${weekNum} — ${statusLabel}` : undefined}
                  >
                    {day}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-x-4 gap-y-1 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex-wrap">
            {LEGEND.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[key]}`} />
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
