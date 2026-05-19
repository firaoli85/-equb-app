"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { updatePaymentStatus } from "@/actions/payments";
import { statusColor, paymentMethodLabel } from "@/lib/utils";

type Status = "PENDING" | "PAID" | "LATE" | "DEFERRED" | "PARTIAL";
type Method = "CASH" | "ZELLE" | "OTHER" | null;

interface GridMember {
  id: string;
  nameAmharic: string;
  nameEnglishFirst: string;
  wheelNumber: number;
}

interface GridWeek {
  id: string;
  weekNumber: number;
  date: string;
  isSkipped: boolean;
}

interface GridPayment {
  id: string;
  memberId: string;
  weekId: string;
  status: Status;
  method: Method;
  notes: string | null;
}

interface GridData {
  members: GridMember[];
  weeks: GridWeek[];
  payments: GridPayment[];
}

const STATUS_ICON: Record<Status, React.ReactNode> = {
  PAID:     "✓",
  LATE:     "!",
  PENDING:  "−",
  DEFERRED: (
    <svg className="w-3.5 h-3.5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
    </svg>
  ),
  PARTIAL: (
    <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 16 16">
      <path d="M8 1a7 7 0 0 0 0 14z" fill="currentColor" />
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

const STATUS_LABELS: Record<Status, string> = {
  PENDING:  "Pending",
  PAID:     "Paid",
  LATE:     "Late",
  DEFERRED: "Deferred",
  PARTIAL:  "Partial",
};

export default function PaymentGrid({ data }: { data: GridData }) {
  const [payments, setPayments] = useState(data.payments);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  const paymentMap = new Map(
    payments.map((p) => [`${p.memberId}:${p.weekId}`, p])
  );

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse" style={{ minWidth: "max-content" }}>
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="sticky left-0 z-20 bg-white dark:bg-[#141414] text-left px-3 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-r-2 border-gray-200 dark:border-gray-700 min-w-[5.5rem] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.4)]">
                Week
              </th>
              {data.members.map((m) => (
                <th
                  key={m.id}
                  className="px-2 py-3 text-center font-medium text-gray-700 dark:text-gray-300 border-b-0 min-w-[4rem] whitespace-nowrap"
                  title={`Lucky #${m.wheelNumber}`}
                >
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{m.nameEnglishFirst || m.nameAmharic}</div>
                  <div className="text-gray-400 dark:text-gray-500 font-normal text-xs">#{m.wheelNumber}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {data.weeks.map((week) => (
              <tr
                key={week.id}
                className={
                  week.isSkipped
                    ? "opacity-40 bg-red-50/50 dark:bg-red-950/10"
                    : "hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors"
                }
              >
                <td className="sticky left-0 z-10 bg-white dark:bg-[#141414] px-3 py-2 border-r-2 border-gray-200 dark:border-gray-700 whitespace-nowrap shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.4)]">
                  <div className="font-semibold text-gray-900 dark:text-white text-xs">Wk {week.weekNumber}</div>
                  <div className="text-gray-400 dark:text-gray-500 text-xs">{week.date}</div>
                  {week.isSkipped && (
                    <span className="text-red-400 dark:text-red-500 font-semibold text-xs">SKIP</span>
                  )}
                </td>
                {data.members.map((m) => {
                  const p = paymentMap.get(`${m.id}:${week.id}`);
                  if (!p) {
                    return (
                      <td key={m.id} className="px-2 py-2 text-center">
                        <span className="text-gray-200 dark:text-gray-700">—</span>
                      </td>
                    );
                  }
                  return (
                    <td key={m.id} className="px-2 py-2 text-center relative">
                      <PaymentCell
                        payment={p}
                        isOpen={activeCell === p.id}
                        onOpen={() => setActiveCell(activeCell === p.id ? null : p.id)}
                        onClose={() => setActiveCell(null)}
                        onUpdate={(updated) => {
                          setPayments((prev) =>
                            prev.map((x) => (x.id === updated.id ? updated : x))
                          );
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex gap-5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-950 inline-block border border-emerald-200 dark:border-emerald-800" />
          Paid
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-950 inline-block border border-amber-200 dark:border-amber-800" />
          Late
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-orange-100 dark:bg-orange-950 inline-block border border-orange-200 dark:border-orange-800" />
          Deferred
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-100 dark:bg-blue-950 inline-block border border-blue-200 dark:border-blue-800" />
          Partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800 inline-block border border-gray-200 dark:border-gray-700" />
          Pending
        </span>
      </div>
    </div>
  );
}

function PaymentCell({
  payment,
  isOpen,
  onOpen,
  onClose,
  onUpdate,
}: {
  payment: GridPayment;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onUpdate: (p: GridPayment) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(payment.status);
  const [method, setMethod] = useState<Method>(payment.method);
  const [notes, setNotes] = useState(payment.notes ?? "");
  const [justPaid, setJustPaid] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  function handleSave() {
    startTransition(async () => {
      const isNewlyPaid = status === "PAID" && payment.status !== "PAID";
      await updatePaymentStatus({ paymentId: payment.id, status, method, notes });
      onUpdate({ ...payment, status, method, notes });
      if (isNewlyPaid) {
        setJustPaid(true);
        setTimeout(() => setJustPaid(false), 650);
      }
      onClose();
    });
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={onOpen}
        className={`w-10 h-10 rounded-xl text-xs font-bold transition-all hover:scale-105 hover:shadow-sm active:scale-95 touch-manipulation flex items-center justify-center ${statusColor(payment.status)} ${justPaid ? "animate-paid-flash" : ""}`}
        title={`${STATUS_LABELS[payment.status]}${payment.method ? ` · ${paymentMethodLabel(payment.method)}` : ""}`}
      >
        {justPaid ? (
          <svg className="w-4 h-4 animate-check-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : STATUS_ICON[payment.status]}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute z-50 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 w-60 left-1/2 -translate-x-1/2 top-full mt-2"
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                Status
              </p>
              <div className="grid grid-cols-2 gap-1">
                {(["PENDING", "PAID", "LATE", "DEFERRED"] as Status[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`py-1.5 text-xs rounded-lg font-semibold border transition-colors ${
                      status === s
                        ? statusColor(s) + " border-transparent"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 bg-transparent"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
                <button
                  onClick={() => setStatus("PARTIAL")}
                  className={`col-span-2 py-1.5 text-xs rounded-lg font-semibold border transition-colors ${
                    status === "PARTIAL"
                      ? statusColor("PARTIAL") + " border-transparent"
                      : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 bg-transparent"
                  }`}
                >
                  Partial Payment
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                Method
              </p>
              <div className="flex gap-1 flex-wrap">
                {([null, "CASH", "ZELLE", "OTHER"] as Method[]).map((m) => (
                  <button
                    key={m ?? "none"}
                    onClick={() => setMethod(m)}
                    className={`px-2 py-1 text-xs rounded-lg border transition-colors font-medium ${
                      method === m
                        ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 bg-transparent"
                    }`}
                  >
                    {m === null ? "None" : m === "CASH" ? "Cash" : m === "ZELLE" ? "Zelle" : "Other"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                Notes
              </p>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                placeholder="Optional note"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {isPending ? "Saving…" : "Save"}
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
