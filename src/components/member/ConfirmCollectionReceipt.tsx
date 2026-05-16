"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmCollectionReceipt } from "@/actions/members";

export function ConfirmCollectionReceipt({
  token,
  memberNameEnglish,
  memberNameAmharic,
  weeklyAmountFormatted,
  netFormatted,
  feeFormatted,
  payoutDate,
  winnerWheelNumber,
  remainingWeeks,
  wheelType = "main",
}: {
  token: string;
  memberNameEnglish: string;
  memberNameAmharic: string;
  weeklyAmountFormatted: string;
  netFormatted: string;
  feeFormatted: string;
  payoutDate: string;
  winnerWheelNumber: number;
  remainingWeeks: number;
  wheelType?: "main" | "extra";
}) {
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    if (!checked) return;
    const client = {
      screen: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
    };
    startTransition(async () => {
      await confirmCollectionReceipt(token, wheelType, client);
      router.refresh();
    });
  }

  const label = wheelType === "extra" ? "Extra Wheel Collection Receipt" : "Collection Receipt Agreement";

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">{label}</h3>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Wheel #{winnerWheelNumber} · Please acknowledge receipt of your payout
          </p>
        </div>
      </div>

      {/* English */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-blue-100 dark:border-blue-900 p-4">
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">English</p>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          I, <strong className="text-gray-900 dark:text-white">{memberNameEnglish}</strong>, confirm that I received{" "}
          <strong className="text-emerald-600 dark:text-emerald-400">{netFormatted}</strong> on{" "}
          <strong>{payoutDate}</strong> as my Equb collection for Wheel{" "}
          <strong>#{winnerWheelNumber}</strong>. A management fee of{" "}
          <strong className="text-amber-600 dark:text-amber-400">{feeFormatted}</strong> was deducted. I agree to
          continue making my weekly contribution of{" "}
          <strong className="text-emerald-600 dark:text-emerald-400">{weeklyAmountFormatted}</strong> for the remaining{" "}
          <strong>{remainingWeeks}</strong> weeks until Week 20 (September 27, 2026), regardless of having received my
          collection.
        </p>
      </div>

      {/* Amharic */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-blue-100 dark:border-blue-900 p-4">
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">አማርኛ</p>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed" lang="am">
          እኔ <strong className="text-gray-900 dark:text-white">{memberNameAmharic}</strong> ቁጥር{" "}
          <strong>#{winnerWheelNumber}</strong> ዪዬ ጎማ ሲወጣ{" "}
          <strong className="text-emerald-600 dark:text-emerald-400">{netFormatted}</strong> እንደተቀበልኩ አረጋግጣለሁ።{" "}
          <strong className="text-amber-600 dark:text-amber-400">{feeFormatted}</strong> የአስተዳደር ክፍያ ተቀንሷል። ለቀሪዎቹ{" "}
          <strong>{remainingWeeks}</strong> ሳምንታት እስከ ሳምንት 20 ድረስ{" "}
          <strong className="text-emerald-600 dark:text-emerald-400">{weeklyAmountFormatted}</strong> የሳምንታዊ ክፍያዬን
          መክፈሌን እንደምቀጥል እስማማለሁ።
        </p>
      </div>

      {/* Checkbox + sign */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <span className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
          I confirm receipt of my payout and agree to continue my weekly contributions.
        </span>
      </label>

      <button
        onClick={handleConfirm}
        disabled={!checked || isPending}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-white rounded-xl font-semibold text-sm disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {isPending ? "Signing…" : "Confirm Receipt & Sign"}
      </button>
    </div>
  );
}
