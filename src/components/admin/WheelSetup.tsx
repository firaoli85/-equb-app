"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveWheelSlots, savePriorityNumbers } from "@/actions/wheel";

const MAIN_WHEEL_CAP_CENTS = 100_000; // $1,000/week

interface SlotData { position: number; numbers: number[] }
interface NumberInfo { memberName: string; amountCents: number }
type DragSrc =
  | { kind: "slot"; position: number; num: number }
  | { kind: "unassigned"; num: number };

interface Props {
  initialSlots: SlotData[];
  initialPriorityNums: number[];
  numberInfo: Record<number, NumberInfo>;
  drawnNumbers: number[];
  allMemberNumbers: number[];
}

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const DragHandleIcon = () => (
  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="9" cy="5" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="15" cy="5" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="15" cy="19" r="1.5" />
  </svg>
);

export function WheelSetup({
  initialSlots,
  initialPriorityNums,
  numberInfo,
  drawnNumbers,
  allMemberNumbers,
}: Props) {
  const router = useRouter();

  const [slots, setSlots] = useState<SlotData[]>(initialSlots);
  const [priorityNums, setPriorityNums] = useState<number[]>(initialPriorityNums);

  // Drag state
  const [dragSrc, setDragSrc] = useState<DragSrc | null>(null);
  const [dragOver, setDragOver] = useState<number | "unassigned" | null>(null);

  // Save state
  const [slotStatus, setSlotStatus] = useState<{
    error?: string;
    warning?: string;
    success?: boolean;
  } | null>(null);
  const [prioStatus, setPrioStatus] = useState<{ error?: string; success?: boolean } | null>(null);
  const [isSavingSlots, startSlotsTransition] = useTransition();
  const [isSavingPrio, startPrioTransition] = useTransition();

  // Priority input
  const [prioInput, setPrioInput] = useState("");
  const [prioInputError, setPrioInputError] = useState("");

  // Next position for newly added slots (always increments, never reused)
  const nextPos = useRef(
    initialSlots.length > 0 ? Math.max(...initialSlots.map((s) => s.position)) + 1 : 1
  );

  // ── Derived ────────────────────────────────────────────────────────────────
  const drawnSet = new Set(drawnNumbers);

  // Numbers not currently in any slot
  const allSlotNums = new Set(slots.flatMap((s) => s.numbers));
  const unassigned = allMemberNumbers.filter((n) => !allSlotNums.has(n));

  function isLocked(position: number): boolean {
    return (
      slots.find((s) => s.position === position)?.numbers.some((n) => drawnSet.has(n)) ?? false
    );
  }

  function slotTotal(numbers: number[]): number {
    return numbers.reduce((sum, n) => {
      const info = (numberInfo as Record<number, NumberInfo | undefined>)[n];
      return sum + (info?.amountCents ?? 0);
    }, 0);
  }

  const anyOverCap = slots.some(
    (s) => s.numbers.length > 0 && slotTotal(s.numbers) > MAIN_WHEEL_CAP_CENTS
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function handleDrop(to: number | "unassigned") {
    if (!dragSrc) return;
    const fromPos: number | "unassigned" =
      dragSrc.kind === "slot" ? dragSrc.position : "unassigned";

    if (fromPos === to) { setDragSrc(null); setDragOver(null); return; }
    // Locked source slot — can't drag out
    if (dragSrc.kind === "slot" && isLocked(dragSrc.position)) {
      setDragSrc(null); setDragOver(null); return;
    }
    // Locked target slot — can't drag in
    if (to !== "unassigned" && isLocked(to)) {
      setDragSrc(null); setDragOver(null); return;
    }

    const num = dragSrc.num;

    setSlots((prev) =>
      prev.map((s) => {
        if (s.position === fromPos) return { ...s, numbers: s.numbers.filter((n) => n !== num) };
        if (s.position === to) return { ...s, numbers: [...s.numbers, num] };
        return s;
      })
    );

    setDragSrc(null);
    setDragOver(null);
    setSlotStatus(null);
  }

  // ── Slot management ────────────────────────────────────────────────────────
  function addSlot() {
    const pos = nextPos.current++;
    setSlots((prev) => [...prev, { position: pos, numbers: [] }]);
  }

  function deleteSlot(position: number) {
    const slot = slots.find((s) => s.position === position);
    if (!slot || slot.numbers.length > 0 || isLocked(position)) return;
    setSlots((prev) => prev.filter((s) => s.position !== position));
  }

  // ── Save slots ─────────────────────────────────────────────────────────────
  function handleSaveSlots() {
    setSlotStatus(null);
    startSlotsTransition(async () => {
      const result = await saveWheelSlots(slots.filter((s) => s.numbers.length > 0));
      if (result.error) {
        setSlotStatus({ error: result.error });
      } else {
        setSlotStatus({ success: true, warning: result.warning });
        router.refresh();
      }
    });
  }

  // ── Priority handlers ──────────────────────────────────────────────────────
  function addPriorityNum() {
    const n = parseInt(prioInput.trim(), 10);
    if (!n || n < 1) { setPrioInputError("Enter a valid lucky number."); return; }
    const info = (numberInfo as Record<number, NumberInfo | undefined>)[n];
    if (!info) { setPrioInputError(`#${n} belongs to no member.`); return; }
    if (priorityNums.includes(n)) { setPrioInputError(`#${n} is already in the list.`); return; }
    setPriorityNums((prev) => [...prev, n]);
    setPrioInput("");
    setPrioInputError("");
  }

  function handleSavePriority() {
    setPrioStatus(null);
    startPrioTransition(async () => {
      const result = await savePriorityNumbers(priorityNums);
      if (result.error) {
        setPrioStatus({ error: result.error });
      } else {
        setPrioStatus({ success: true });
        router.refresh();
      }
    });
  }

  const saveSlotsBlockReason = anyOverCap
    ? "One or more slots exceed $1,000/week — rearrange before saving."
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <div className="flex gap-6 items-start">

        {/* ── Left: slot grid ── */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Wheel Slots
            </p>
            <button
              onClick={addSlot}
              className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add slot
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {slots.map((slot) => {
              const locked = isLocked(slot.position);
              const total = slotTotal(slot.numbers);
              const overCap = slot.numbers.length > 0 && total > MAIN_WHEEL_CAP_CENTS;
              const isDropTarget = dragOver === slot.position && dragSrc !== null;
              const canReceiveDrop =
                dragSrc !== null &&
                !locked &&
                !(dragSrc.kind === "slot" && dragSrc.position === slot.position);

              return (
                <div
                  key={slot.position}
                  onDragOver={(e) => { if (canReceiveDrop) e.preventDefault(); }}
                  onDragEnter={() => { if (canReceiveDrop) setDragOver(slot.position); }}
                  onDrop={(e) => { e.preventDefault(); handleDrop(slot.position); }}
                  className={[
                    "relative rounded-2xl border p-4 transition-all duration-150",
                    locked
                      ? "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700"
                      : overCap
                        ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700"
                        : isDropTarget
                          ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-400 ring-offset-2 dark:ring-offset-gray-900"
                          : "bg-white dark:bg-[#141414] border-gray-100 dark:border-gray-800",
                  ].join(" ")}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        pos {slot.position}
                      </span>
                      {locked && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                          </svg>
                          Drawn
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {slot.numbers.length > 0 && (
                        <span
                          className={`text-sm font-bold ${
                            overCap
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {fmt(total)}
                          {overCap && <span className="font-normal text-xs"> — over $1,000</span>}
                        </span>
                      )}
                      {!locked && slot.numbers.length === 0 && (
                        <button
                          onClick={() => deleteSlot(slot.position)}
                          title="Delete empty slot"
                          className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Number chips */}
                  <div className="flex flex-wrap gap-1.5 min-h-[2.5rem]">
                    {slot.numbers.map((n) => {
                      const info = (numberInfo as Record<number, NumberInfo | undefined>)[n];
                      const isDrawn = drawnSet.has(n);
                      const isGhost = !info;
                      return (
                        <div
                          key={n}
                          draggable={!locked}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            setDragSrc({ kind: "slot", position: slot.position, num: n });
                          }}
                          onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
                          className={[
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold select-none transition-shadow",
                            isDrawn
                              ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-default"
                              : isGhost
                                ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 cursor-grab active:cursor-grabbing"
                                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 cursor-grab active:cursor-grabbing hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm",
                          ].join(" ")}
                        >
                          {!locked && (
                            <span className="text-gray-300 dark:text-gray-600">
                              <DragHandleIcon />
                            </span>
                          )}
                          <span className="font-bold">#{n}</span>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          {isGhost ? (
                            <span className="text-red-500 dark:text-red-400 font-bold">NO MEMBER</span>
                          ) : (
                            <span className="text-gray-600 dark:text-gray-300">{info!.memberName}</span>
                          )}
                          {info && (
                            <>
                              <span className="text-gray-200 dark:text-gray-700">·</span>
                              <span className="text-gray-400 dark:text-gray-500">{fmt(info.amountCents)}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                    {slot.numbers.length === 0 && !isDropTarget && (
                      <p className="text-xs text-gray-300 dark:text-gray-700 italic self-center">
                        empty — drag a number here
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save slots row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleSaveSlots}
              disabled={!!saveSlotsBlockReason || isSavingSlots}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSavingSlots ? "Saving…" : "Save Slots"}
            </button>
            {saveSlotsBlockReason && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {saveSlotsBlockReason}
              </p>
            )}
            {slotStatus?.error && (
              <p className="text-sm text-red-600 dark:text-red-400">{slotStatus.error}</p>
            )}
            {slotStatus?.success && (
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                  Slots saved.
                </p>
                {slotStatus.warning && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    {slotStatus.warning}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: sidebar ── */}
        <div className="w-60 shrink-0 space-y-4">

          {/* Unassigned tray */}
          <div
            onDragOver={(e) => {
              if (dragSrc?.kind === "slot" && !isLocked(dragSrc.position)) e.preventDefault();
            }}
            onDragEnter={() => {
              if (dragSrc?.kind === "slot" && !isLocked(dragSrc.position))
                setDragOver("unassigned");
            }}
            onDrop={(e) => { e.preventDefault(); handleDrop("unassigned"); }}
            className={[
              "rounded-2xl border p-4 min-h-[7rem] transition-all duration-150",
              dragOver === "unassigned" && dragSrc?.kind === "slot"
                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-400 ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-gray-900"
                : "bg-gray-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800",
            ].join(" ")}
          >
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Unassigned
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-600 mb-3 leading-snug">
              Drag here to remove a number from a slot, or drag from here onto a slot to assign it.
            </p>
            {unassigned.length === 0 ? (
              <p className="text-xs text-gray-300 dark:text-gray-700 italic">All numbers in slots</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {unassigned.map((n) => {
                  const info = (numberInfo as Record<number, NumberInfo | undefined>)[n];
                  return (
                    <div
                      key={n}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        setDragSrc({ kind: "unassigned", num: n });
                      }}
                      onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
                      className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs font-semibold text-amber-800 dark:text-amber-300 cursor-grab active:cursor-grabbing select-none hover:shadow-sm transition-shadow"
                    >
                      <span className="text-amber-400 dark:text-amber-600"><DragHandleIcon /></span>
                      <span className="font-bold">#{n}</span>
                      {info && (
                        <span className="font-normal text-amber-700 dark:text-amber-400">
                          {info.memberName}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Priority numbers editor */}
          <div className="bg-white dark:bg-[#141414] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-3">
            <div>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Priority Numbers
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1 leading-snug">
                When any of these is in an eligible slot, one is picked first. Never shown to members.
              </p>
            </div>

            {/* Current priority chips */}
            <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
              {priorityNums.length === 0 ? (
                <p className="text-xs text-gray-300 dark:text-gray-700 italic">None set</p>
              ) : (
                priorityNums.map((n) => {
                  const info = (numberInfo as Record<number, NumberInfo | undefined>)[n];
                  return (
                    <div
                      key={n}
                      className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs font-semibold text-purple-800 dark:text-purple-300"
                    >
                      <span className="font-bold">#{n}</span>
                      {info && (
                        <span className="font-normal text-purple-600 dark:text-purple-400 ml-0.5">
                          {info.memberName.split(" ")[0]}
                        </span>
                      )}
                      <button
                        onClick={() => setPriorityNums((prev) => prev.filter((x) => x !== n))}
                        className="ml-1 text-purple-300 dark:text-purple-600 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                        title={`Remove #${n} from priority`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add a priority number */}
            <div className="flex gap-1.5">
              <input
                type="number"
                value={prioInput}
                onChange={(e) => { setPrioInput(e.target.value); setPrioInputError(""); }}
                onKeyDown={(e) => e.key === "Enter" && addPriorityNum()}
                placeholder="Lucky #"
                className="flex-1 min-w-0 text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={addPriorityNum}
                disabled={!prioInput.trim()}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Add
              </button>
            </div>
            {prioInputError && (
              <p className="text-xs text-red-500 dark:text-red-400">{prioInputError}</p>
            )}

            <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleSavePriority}
                disabled={isSavingPrio}
                className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSavingPrio ? "Saving…" : "Save Priority"}
              </button>
              {prioStatus?.error && (
                <p className="text-xs text-red-500 dark:text-red-400">{prioStatus.error}</p>
              )}
              {prioStatus?.success && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  Priority saved.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
