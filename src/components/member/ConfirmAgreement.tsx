"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmAgreement } from "@/actions/members";

export function ConfirmAgreement({
  token,
  memberName,
  weeklyAmountFormatted,
}: {
  token: string;
  memberName: string;
  weeklyAmountFormatted: string;
}) {
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    if (!checked) return;
    startTransition(async () => {
      await confirmAgreement(token);
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0a0a0b] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 dark:bg-emerald-950 rounded-2xl mb-3">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Participation Agreement</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Please read and sign before accessing your Equb profile
          </p>
        </div>

        {/* English */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">English</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            I, <strong className="text-gray-900 dark:text-white">{memberName}</strong>, agree to contribute{" "}
            <strong className="text-emerald-600 dark:text-emerald-400">{weeklyAmountFormatted}</strong> every week for
            all 20 weeks of this Equb cycle starting <strong>May 17, 2026</strong>. I understand that if I choose to
            leave before receiving my collection, I must wait until the Equb ends (<strong>September 27, 2026</strong>)
            to receive a refund of my contributions. The management fee will be deducted from any refund. I agree not
            to disrupt other members by leaving mid-cycle.
          </p>
        </div>

        {/* Amharic */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">አማርኛ</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed" lang="am">
            እኔ <strong className="text-gray-900 dark:text-white">{memberName}</strong> በዚህ የዕቁብ ዑደት ውስጥ ለ20 ሳምንታት
            በሙሉ <strong className="text-emerald-600 dark:text-emerald-400">{weeklyAmountFormatted}</strong> በየሳምንቱ
            ለመክፈል እስማማለሁ። ከዕቁብ ስብስቤ በፊት ለመውጣት ከፈለግሁ፣ ለተመላሽ ገንዘቤ እስከ መስከረም 27 ቀን 2026 ዓ.ም ድረስ
            መጠበቅ እንዳለብኝ ተረድቻለሁ። የአስተዳደር ክፍያ ከተመላሹ ላይ ይቀነሳል።
          </p>
        </div>

        {/* Checkbox + Sign */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              I have read and understood both the English and Amharic versions of this agreement.
              My signature is recorded with my timestamp and IP address.
            </span>
          </label>

          <button
            onClick={handleConfirm}
            disabled={!checked || isPending}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-white rounded-xl font-semibold text-sm disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isPending ? "Signing…" : "Sign Agreement & Access My Profile"}
          </button>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Your timestamp and IP address are recorded as proof of agreement.
          </p>
        </div>
      </div>
    </div>
  );
}
