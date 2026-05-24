"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordWheelWinner } from "@/actions/collection";

const COLOR_PAIRS: { dark: string; light: string }[] = [
  { dark: "#1e3a8a", light: "#dbeafe" },
  { dark: "#065f46", light: "#d1fae5" },
  { dark: "#581c87", light: "#f3e8ff" },
  { dark: "#991b1b", light: "#fee2e2" },
  { dark: "#134e4a", light: "#ccfbf1" },
  { dark: "#713f12", light: "#fef9c3" },
];

function segmentStyle(index: number): { bg: string; textFill: string } {
  const pair = COLOR_PAIRS[Math.floor(index / 2) % COLOR_PAIRS.length];
  const isDark = index % 2 === 0;
  return { bg: isDark ? pair.dark : pair.light, textFill: isDark ? "#ffffff" : pair.dark };
}

const CX = 220;
const CY = 220;
const R = 192;
const RING_R = R + 12;
const HUB_R = 30;
const TEXT_R_RATIO = 0.67;

// 20 merged slots — order determines position on wheel
// Each slot is eligible when ALL its lucky numbers are undrawn
const SLOTS: { numbers: number[] }[] = [
  { numbers: [1, 3] },
  { numbers: [4, 29] },
  { numbers: [6, 34] },
  { numbers: [7, 10] },
  { numbers: [11, 13] },
  { numbers: [12, 27] },
  { numbers: [14, 21] },
  { numbers: [15] },
  { numbers: [155, 19] },
  { numbers: [2] },
  { numbers: [22] },
  { numbers: [5] },
  { numbers: [55] },
  { numbers: [24, 30, 619] },
  { numbers: [8] },
  { numbers: [9] },
  { numbers: [16] },
  { numbers: [18] },
  { numbers: [25] },
  { numbers: [78] },
];

// Hidden priority — pick from these slots first when any are eligible
const PRIORITY_NUMBERS = [5, 6, 34, 39, 78];

function slotLabel(numbers: number[]): string {
  return numbers.join(" & ");
}

// Two display lines for the segment — fits narrow slices
function slotLines(numbers: number[]): string[] {
  if (numbers.length === 1) return [String(numbers[0])];
  if (numbers.length === 2) return [String(numbers[0]), `& ${numbers[1]}`];
  return [`${numbers[0]} & ${numbers[1]}`, `& ${numbers[2]}`];
}

function fontSize(n: number): number {
  if (n <= 6)  return 30;
  if (n <= 10) return 26;
  if (n <= 14) return 22;
  if (n <= 20) return 18;
  return 15;
}

interface WeekOption { id: string; weekNumber: number; date: string }
interface WheelEntry { number: number; name: string; isExtra: boolean }

export function SpinWheel({
  availableNumbers,
  weekOptions,
}: {
  availableNumbers: number[];
  weekOptions: WeekOption[];
  wheelEntries?: WheelEntry[];
}) {
  const router = useRouter();
  const [rotation, setRotation]           = useState(0);
  const [spinning, setSpinning]           = useState(false);
  const [winnerSlotIdx, setWinnerSlotIdx] = useState<number | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState(weekOptions[0]?.id ?? "");
  const [isPending, startTransition]        = useTransition();
  const [manualInput, setManualInput]       = useState("");
  const [manualError, setManualError]       = useState("");
  const [isManualPending, startManualTransition] = useTransition();

  const availSet = new Set(availableNumbers);

  // A slot is eligible only when EVERY one of its numbers is still undrawn
  const eligibleSlots = SLOTS
    .map((slot, origIdx) => ({ ...slot, origIdx }))
    .filter(slot => slot.numbers.every(n => availSet.has(n)));

  const n = eligibleSlots.length;
  const segAngle = n > 0 ? 360 / n : 360;
  const fs = fontSize(n);

  function handleSpin() {
    if (spinning || n === 0 || !selectedWeekId) return;
    setWinnerSlotIdx(null);

    // Priority queue: prefer slots that contain at least one PRIORITY_NUMBER
    const priorityEligible = eligibleSlots.filter(slot =>
      slot.numbers.some(num => PRIORITY_NUMBERS.includes(num))
    );
    const pool = priorityEligible.length > 0 ? priorityEligible : eligibleSlots;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const idx = eligibleSlots.findIndex(s => s.origIdx === chosen.origIdx);

    const winCenter = (idx + 0.5) * segAngle;
    const targetRem = (360 - (winCenter % 360) + 360) % 360;
    const currentRem = rotation % 360;
    const delta = (targetRem - currentRem + 360) % 360;
    const spins = 7 + Math.floor(Math.random() * 5);
    const newRot = rotation + delta + spins * 360;

    setSpinning(true);
    setRotation(newRot);

    setTimeout(() => {
      setSpinning(false);
      setWinnerSlotIdx(idx);
    }, 5000);
  }

  function handleRecord() {
    if (winnerSlotIdx === null || !selectedWeekId) {
      alert(!selectedWeekId ? "Please select a week first." : "No winner selected.");
      return;
    }
    // Record the first number of the winning slot as the representative winner
    const captured = eligibleSlots[winnerSlotIdx].numbers[0];
    startTransition(async () => {
      try {
        const result = await recordWheelWinner(selectedWeekId, captured);
        if (result?.error) { alert(result.error); return; }
        setWinnerSlotIdx(null);
        setRotation(0);
        router.refresh();
      } catch (err) {
        alert("Failed to record winner: " + String(err));
      }
    });
  }

  function handleManualAssign() {
    const num = parseInt(manualInput, 10);
    if (!num || num < 1) { setManualError("Enter a valid lucky number."); return; }
    if (!availSet.has(num)) { setManualError(`Lucky #${num} has already been drawn or does not exist.`); return; }
    const ownerSlot = SLOTS.find(s => s.numbers.includes(num));
    if (ownerSlot && !ownerSlot.numbers.every(x => availSet.has(x))) {
      setManualError(`Slot for #${num} has already been partially drawn.`);
      return;
    }
    if (!selectedWeekId) { setManualError("Select a week first."); return; }
    setManualError("");
    startManualTransition(async () => {
      const result = await recordWheelWinner(selectedWeekId, num);
      if (result?.error) { setManualError(result.error); return; }
      setManualInput("");
      router.refresh();
    });
  }

  // Build SVG segment geometry from eligible slots
  const segments = eligibleSlots.map((slot, i) => {
    const startRad = (i * segAngle - 90) * (Math.PI / 180);
    const endRad   = ((i + 1) * segAngle - 90) * (Math.PI / 180);
    const x1 = CX + R * Math.cos(startRad);
    const y1 = CY + R * Math.sin(startRad);
    const x2 = CX + R * Math.cos(endRad);
    const y2 = CY + R * Math.sin(endRad);
    const largeArc = segAngle > 180 ? 1 : 0;
    const midRad   = ((i + 0.5) * segAngle - 90) * (Math.PI / 180);
    const tr       = R * TEXT_R_RATIO;
    const textX    = CX + tr * Math.cos(midRad);
    const textY    = CY + tr * Math.sin(midRad);
    const textAngle = (i + 0.5) * segAngle;
    const path = `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    const { bg, textFill } = segmentStyle(i);
    const lines = slotLines(slot.numbers);
    return { path, textX, textY, textAngle, slot, lines, bg, textFill };
  });

  const winnerSlot  = winnerSlotIdx !== null ? eligibleSlots[winnerSlotIdx] : null;
  const winnerLabel = winnerSlot ? slotLabel(winnerSlot.numbers) : null;

  if (n === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-bold text-gray-900 dark:text-white text-lg">All slots have been drawn!</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Every member has received their payout.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">

      {/* ── Wheel ── */}
      <div className="relative w-full max-w-[440px] mx-auto">
        <div
          className="absolute z-10 left-1/2 -translate-x-1/2"
          style={{
            top: -6,
            width: 0,
            height: 0,
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: "30px solid #ef4444",
            filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))",
          }}
        />

        <svg
          viewBox="0 0 440 440"
          width="440"
          height="440"
          style={{
            maxWidth: "100%",
            display: "block",
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        >
          <defs>
            <filter id="txt-drop" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.45" />
            </filter>
            <filter id="winner-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
              <feFlood floodColor="#fbbf24" floodOpacity="1" result="gold" />
              <feComposite in="gold" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx={CX} cy={CY} r={RING_R} fill="#0f172a" />

          {segments.map(({ path, textX, textY, textAngle, slot, lines, bg, textFill }, i) => {
            const isWinner = !spinning && winnerSlotIdx === i;
            const lineSpacing = fs * 1.3;
            return (
              <g key={slot.origIdx}>
                <path
                  d={path}
                  fill={bg}
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth="1.5"
                />
                {isWinner && (
                  <path
                    d={path}
                    fill="rgba(251,191,36,0.22)"
                    stroke="#fbbf24"
                    strokeWidth="5"
                    filter="url(#winner-glow)"
                  />
                )}
                <text
                  textAnchor="middle"
                  fill={isWinner ? "#fbbf24" : textFill}
                  fontWeight="900"
                  fontSize={fs}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  filter="url(#txt-drop)"
                  transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                >
                  {lines.map((line, li) => (
                    <tspan
                      key={li}
                      x={textX}
                      y={textY + (li - (lines.length - 1) / 2) * lineSpacing}
                      dominantBaseline="central"
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}

          <circle cx={CX} cy={CY} r={HUB_R} fill="#0f172a" />
          <circle cx={CX} cy={CY} r={HUB_R - 8} fill="#10b981" />
          <circle cx={CX} cy={CY} r={HUB_R - 16} fill="#065f46" />
        </svg>
      </div>

      {/* ── Winner banner ── */}
      {winnerLabel !== null && !spinning && (
        <div className="w-full animate-fade-in-up">
          <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 rounded-3xl p-7 text-center shadow-2xl ring-4 ring-emerald-400 dark:ring-emerald-500 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div className="absolute top-0 left-1/4 w-0.5 h-full bg-white rotate-12" />
              <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white rotate-12" />
              <div className="absolute top-0 left-3/4 w-0.5 h-full bg-white rotate-12" />
            </div>
            <div className="relative">
              <p className="text-emerald-200 text-[10px] font-black uppercase tracking-[0.45em] mb-2">
                Winner
              </p>
              <p className="text-[4rem] leading-none font-black text-white drop-shadow-lg tabular-nums">
                {winnerLabel}
              </p>
              <div className="flex gap-3 mt-5 justify-center">
                <button
                  onClick={handleRecord}
                  disabled={isPending}
                  className="px-6 py-2.5 bg-white text-emerald-800 rounded-xl text-sm font-black hover:bg-emerald-50 disabled:opacity-50 transition-colors shadow-md"
                >
                  {isPending ? "Recording…" : "✓ Confirm & Record"}
                </button>
                <button
                  onClick={() => { setWinnerSlotIdx(null); }}
                  className="px-5 py-2.5 bg-emerald-700/60 border border-emerald-400/40 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Week selector ── */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500 dark:text-gray-400 font-medium">Record for:</span>
        <select
          value={selectedWeekId}
          onChange={(e) => setSelectedWeekId(e.target.value)}
          disabled={spinning || isPending}
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-shadow"
        >
          {weekOptions.map((w) => (
            <option key={w.id} value={w.id}>
              Week {w.weekNumber} — {w.date}
            </option>
          ))}
        </select>
      </div>

      {/* ── Spin button ── */}
      <button
        onClick={handleSpin}
        disabled={spinning || isPending || weekOptions.length === 0}
        className={`px-16 py-4 bg-emerald-600 text-white rounded-full font-black text-2xl tracking-widest hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl ${
          !spinning && !isPending && winnerSlotIdx === null ? "animate-pulse-green" : ""
        }`}
      >
        {spinning ? "SPINNING…" : "SPIN"}
      </button>

      {/* ── Manual override ── */}
      <div className="w-full border-t border-gray-100 dark:border-gray-800 pt-5 space-y-2">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center font-semibold uppercase tracking-wider">
          Manual Override
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            value={manualInput}
            onChange={(e) => { setManualInput(e.target.value); setManualError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleManualAssign()}
            placeholder="Lucky #"
            disabled={spinning || isPending || isManualPending}
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          />
          <button
            onClick={handleManualAssign}
            disabled={!manualInput || spinning || isPending || isManualPending}
            className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isManualPending ? "Assigning…" : "Assign Winner"}
          </button>
        </div>
        {manualError && <p className="text-red-500 dark:text-red-400 text-xs">{manualError}</p>}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {n} slot{n !== 1 ? "s" : ""} remaining on wheel
      </p>
    </div>
  );
}
