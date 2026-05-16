"use client";

import { useActionState } from "react";
import { createMember } from "@/actions/members";
import Link from "next/link";

const initialState = { error: undefined as string | undefined };

const SUGGESTED_AMOUNTS = [250, 500, 750, 1000, 1250, 1500, 1750, 2000];

export default function NewMemberPage() {
  const [state, formAction, pending] = useActionState(createMember, initialState);

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/members"
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          ← Members
        </Link>
        <span className="text-gray-200 dark:text-gray-700">/</span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Member</h1>
      </div>

      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-7">
        <form action={formAction} className="space-y-5">

          {/* Amharic Name */}
          <div>
            <label htmlFor="nameAmharic" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Name (Amharic) <span className="text-red-500">*</span>
            </label>
            <input
              id="nameAmharic"
              name="nameAmharic"
              type="text"
              required
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
              placeholder="e.g. አበበ ከበደ"
            />
          </div>

          {/* English Name — two fields side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="nameEnglishFirst" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                First Name (English)
              </label>
              <input
                id="nameEnglishFirst"
                name="nameEnglishFirst"
                type="text"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                placeholder="e.g. Abebe"
              />
            </div>
            <div>
              <label htmlFor="nameEnglishLast" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Last Name (English)
              </label>
              <input
                id="nameEnglishLast"
                name="nameEnglishLast"
                type="text"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                placeholder="e.g. Kebede"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Phone <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
              placeholder="e.g. 555-123-4567"
            />
          </div>

          {/* Weekly Amount */}
          <div>
            <label htmlFor="weeklyAmount" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Weekly Contribution ($) <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTED_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                  onClick={() => {
                    const input = document.getElementById("weeklyAmount") as HTMLInputElement;
                    if (input) input.value = String(amt);
                  }}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <input
              id="weeklyAmount"
              name="weeklyAmount"
              type="number"
              required
              min="1"
              step="1"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
              placeholder="e.g. 500"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              Fee = (weekly × 20 ÷ $5,000) × $100
            </p>
          </div>

          {/* Wheel numbers — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="wheelNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Wheel Number <span className="text-red-500">*</span>
              </label>
              <input
                id="wheelNumber"
                name="wheelNumber"
                type="number"
                required
                min="1"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                placeholder="Primary"
              />
            </div>
            <div>
              <label htmlFor="extraWheelNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Extra Wheel # <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="extraWheelNumber"
                name="extraWheelNumber"
                type="number"
                min="1"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                placeholder="Extra"
              />
            </div>
          </div>

          {state?.error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 rounded-xl">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
            >
              {pending ? "Adding…" : "Add Member"}
            </button>
            <Link
              href="/admin/members"
              className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
