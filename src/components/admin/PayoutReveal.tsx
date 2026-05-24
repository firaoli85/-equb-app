"use client";

import { useState } from "react";

export function PayoutReveal({
  memberName,
  gross,
  fee,
  net,
  date,
}: {
  memberName: string;
  gross: string;
  fee: string;
  net: string;
  date: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm animate-fade-in-up-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Current Week Payout
        </h2>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Hide payout details" : "Show payout details"}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {visible ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      {visible && (
        <div className="flex flex-wrap gap-6">
          <PayoutItem label="Member" value={memberName} />
          <PayoutItem label="Gross" value={gross} />
          <PayoutItem label="Fee" value={fee} valueClass="text-amber-500" />
          <PayoutItem
            label="Net Payout"
            value={net}
            valueClass="text-emerald-600 dark:text-emerald-400 text-xl font-bold"
          />
          <PayoutItem label="Date" value={date} />
        </div>
      )}
    </div>
  );
}

function PayoutItem({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mb-0.5">
        {label}
      </p>
      <p className={`font-semibold text-gray-900 dark:text-white ${valueClass ?? "text-base"}`}>
        {value}
      </p>
    </div>
  );
}
