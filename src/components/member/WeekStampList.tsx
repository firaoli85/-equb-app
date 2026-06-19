"use client";

import { useEffect, useRef, useState } from "react";

export type StampWeek = {
  id: string;
  weekNumber: number;
  date: string;
  status: "PAID" | "LATE" | "DEFERRED" | "PARTIAL" | "PENDING";
  isMainPayoutWeek: boolean;
  isExtraPayoutWeek: boolean;
};

const STATUS_LABEL: Record<StampWeek["status"], string> = {
  PAID:     "Paid",
  LATE:     "Late",
  DEFERRED: "Deferred",
  PARTIAL:  "Partial",
  PENDING:  "Upcoming",
};

const BADGE_CLS: Record<StampWeek["status"], string> = {
  PAID:     "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40",
  LATE:     "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40",
  DEFERRED: "text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40",
  PARTIAL:  "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40",
  PENDING:  "text-gray-400 dark:text-gray-600",
};

// ── Timing constants ────────────────────────────────────────────────────────
const FILL_MS  = 420;  // fill sweep (CSS transition duration)
const MARK_MS  = 220;  // checkBounce animation duration
// Total time to hold on each row before starting the next:
// fill completes at FILL_MS, mark bounces in over MARK_MS, then a short settle.
const SLOT_MS  = FILL_MS + MARK_MS + 30; // ~670ms per row

export function WeekStampList({
  weeks,
  sessionKey,
}: {
  weeks: StampWeek[];
  /** Member token — used to scope the "already animated" flag to this login session. */
  sessionKey?: string;
}) {
  const storageKey = sessionKey ? `equb_tally_animated_${sessionKey}` : null;
  // DOM refs for IntersectionObserver
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── Queue engine — all mutable refs, no render triggers ─────────────────
  // queueRef    : indices waiting to animate, kept in ascending (week) order
  // isRunning   : true while a slot's fill+mark cycle is in progress
  // activeIdxRef: mirrors activeIdx state but readable synchronously
  // filledRef   : mirrors filled state but readable synchronously
  // timerRef    : handle for the current slot's setTimeout
  const queueRef      = useRef<number[]>([]);
  const isRunning     = useRef(false);
  const activeIdxRef  = useRef<number | null>(null);
  const filledRef     = useRef(new Set<number>());
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Render state ─────────────────────────────────────────────────────────
  const [activeIdx,     setActiveIdx]     = useState<number | null>(null);
  const [filled,        setFilled]        = useState<Set<number>>(new Set());
  const [reducedMotion, setReducedMotion] = useState(false);

  // ── startNext ─────────────────────────────────────────────────────────────
  // Stored in a ref so that the setTimeout callback always calls the latest
  // version, never a stale closure from a previous render.
  const startNextRef = useRef<() => void>(() => {});
  startNextRef.current = () => {
    if (queueRef.current.length === 0) {
      isRunning.current = false;
      // Animation finished — flag this session so all future mounts render static
      if (storageKey) {
        try { sessionStorage.setItem(storageKey, "1"); } catch {}
      }
      return;
    }
    isRunning.current = true;
    const nextIdx = queueRef.current.shift()!;
    activeIdxRef.current = nextIdx;
    setActiveIdx(nextIdx); // triggers render → fill starts for this row

    timerRef.current = setTimeout(() => {
      // Fill + mark complete. Commit this row as done, then continue.
      filledRef.current.add(nextIdx);
      setFilled(new Set(filledRef.current)); // new ref → React re-renders
      activeIdxRef.current = null;
      setActiveIdx(null);
      startNextRef.current(); // process next queued row via latest ref
    }, SLOT_MS);
  };

  // ── Reduced-motion detection (client-only, avoids SSR mismatch) ──────────
  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // ── Main effect: IO + queue processor ────────────────────────────────────
  useEffect(() => {
    // Reset engine state at effect boundary (covers weeks changes + StrictMode re-run)
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    queueRef.current     = [];
    isRunning.current    = false;
    activeIdxRef.current = null;
    filledRef.current    = new Set();
    setActiveIdx(null);
    setFilled(new Set());

    // Check sessionStorage (safe here — effects only run on the client, never during SSR)
    let alreadyAnimated = false;
    if (storageKey) {
      try { alreadyAnimated = sessionStorage.getItem(storageKey) === "1"; } catch {}
    }

    if (reducedMotion || alreadyAnimated) {
      // Static path: show all non-PENDING rows filled immediately, no animation.
      const all = new Set<number>(
        weeks.map((w, i) => (w.status !== "PENDING" ? i : -1)).filter(i => i >= 0)
      );
      filledRef.current = all;
      setFilled(new Set(all));
      return;
    }

    // enqueue: insert idx in ascending order, then kick the processor if idle.
    function enqueue(idx: number) {
      if (filledRef.current.has(idx)) return;    // already done
      if (activeIdxRef.current === idx) return;  // currently animating
      const q = queueRef.current;
      if (q.includes(idx)) return;               // already waiting
      // Insert keeping queue sorted by index (= week-number order)
      const pos = q.findIndex(i => i > idx);
      if (pos === -1) q.push(idx);
      else q.splice(pos, 0, idx);
      if (!isRunning.current) startNextRef.current();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = parseInt(
            (entry.target as HTMLElement).dataset.idx ?? "-1",
            10
          );
          if (idx < 0 || weeks[idx]?.status === "PENDING") continue;
          enqueue(idx);
        }
      },
      { threshold: 0.15 }
    );

    rowRefs.current.filter(Boolean).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [weeks, reducedMotion, storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0.5" role="list">
      {weeks.map((w, idx) => {
        const isPayoutWeek = w.isMainPayoutWeek || w.isExtraPayoutWeek;
        const isActive = idx === activeIdx;   // this row is currently animating
        const isDone   = filled.has(idx);     // this row has finished and is permanent
        const showFill = isActive || isDone;
        const paid     = w.status === "PAID";
        const notPaid  = w.status === "LATE" || w.status === "DEFERRED" || w.status === "PARTIAL";
        const hasFill  = paid || notPaid;
        const emoji    = paid ? "⭐" : notPaid ? "😔" : null;

        return (
          <div
            key={w.id}
            ref={(el) => { rowRefs.current[idx] = el; }}
            data-idx={String(idx)}
            role="listitem"
            className={[
              "relative overflow-hidden rounded-lg",
              isPayoutWeek ? "ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800" : "",
            ].join(" ")}
          >
            {/*
              Fill bar — always in DOM for non-PENDING rows so the browser has a
              "previous computed value" (0%) to transition FROM when isActive flips.
              If the bar were unmounted and remounted with width:100%, the browser
              would skip the transition (no previous value to animate from).
            */}
            {hasFill && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundColor: paid ? "var(--fill-green)" : "var(--fill-red)",
                  width: showFill ? "100%" : "0%",
                  // Transition only fires on the active slot; done rows stay put.
                  transition: isActive && !reducedMotion
                    ? `width ${FILL_MS}ms ease`
                    : "none",
                }}
                aria-hidden="true"
              />
            )}

            {/* Row content — always on top, always readable */}
            <div className="relative z-10 flex items-center gap-2 px-2.5 py-2 text-xs">
              <span className="w-5 text-[11px] text-center font-mono font-bold text-gray-400 dark:text-gray-600 shrink-0">
                {w.weekNumber}
              </span>

              <span className="flex-1 text-gray-600 dark:text-gray-400 tabular-nums">
                {w.date}
              </span>

              {isPayoutWeek && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wider shrink-0"
                  style={{ color: "var(--accent)" }}
                >
                  payout
                </span>
              )}

              {/* Status word — always visible, never blank */}
              <span className={`text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-md ${BADGE_CLS[w.status]}`}>
                {STATUS_LABEL[w.status]}
              </span>

              {/*
                Mark — pops in when fill completes.
                While isActive: checkBounce fires after FILL_MS delay.
                  animation-fill-mode:both keeps it invisible (scale:0, opacity:0)
                  during the fill sweep, then bounces in at exactly FILL_MS ms.
                When isDone: animation removed, explicit opacity:1 keeps it visible.
              */}
              <span className="w-5 shrink-0 text-sm leading-none text-center" aria-hidden="true">
                {emoji && showFill ? (
                  <span
                    style={{
                      display: "inline-block",
                      animation: isActive && !reducedMotion
                        ? `checkBounce ${MARK_MS}ms cubic-bezier(0.34,1.56,0.64,1) ${FILL_MS}ms both`
                        : "none",
                      opacity: isDone ? 1 : undefined,
                    }}
                  >
                    {emoji}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
