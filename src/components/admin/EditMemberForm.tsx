"use client";

import { useActionState } from "react";
import { updateMember } from "@/actions/members";
import Link from "next/link";

const SUGGESTED_AMOUNTS = [250, 500, 750, 1000, 1250, 1500, 1750, 2000];

interface Defaults {
  nameAmharic: string;
  nameEnglishFirst: string;
  nameEnglishLast: string;
  phone: string;
  weeklyAmount: number;
  wheelNumber: number;
  extraWheelNumber?: number;
  displayPreference: "AMHARIC" | "ENGLISH";
}

export function EditMemberForm({
  memberId,
  hasPinSet,
  defaults,
  mainWon,
  extraWon,
}: {
  memberId: string;
  hasPinSet: boolean;
  defaults: Defaults;
  mainWon: boolean;
  extraWon: boolean;
}) {
  const boundAction = updateMember.bind(null, memberId);
  const [state, formAction, pending] = useActionState(boundAction, {});

  return (
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
            defaultValue={defaults.nameAmharic}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
          />
        </div>

        {/* English Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="nameEnglishFirst" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              First Name (English)
            </label>
            <input
              id="nameEnglishFirst"
              name="nameEnglishFirst"
              type="text"
              defaultValue={defaults.nameEnglishFirst}
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
              defaultValue={defaults.nameEnglishLast}
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
            defaultValue={defaults.phone}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
            placeholder="+12025551234"
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
            defaultValue={defaults.weeklyAmount}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            Fee = (weekly × 20 ÷ $5,000) × $100
          </p>
        </div>

        {/* Wheel numbers */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="wheelNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Lucky Number <span className="text-red-500">*</span>
            </label>
            <input
              id="wheelNumber"
              name={mainWon ? undefined : "wheelNumber"}
              type="number"
              required={!mainWon}
              min="1"
              defaultValue={defaults.wheelNumber}
              disabled={mainWon}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {mainWon && (
              <>
                <input type="hidden" name="wheelNumber" value={defaults.wheelNumber} />
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                  Already drawn — locked
                </p>
              </>
            )}
          </div>
          <div>
            <label htmlFor="extraWheelNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Extra Lucky # <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="extraWheelNumber"
              name={extraWon ? undefined : "extraWheelNumber"}
              type="number"
              min="1"
              defaultValue={defaults.extraWheelNumber ?? ""}
              disabled={extraWon}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Extra"
            />
            {extraWon && (
              <>
                <input type="hidden" name="extraWheelNumber" value={defaults.extraWheelNumber ?? ""} />
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                  Already drawn — locked
                </p>
              </>
            )}
          </div>
        </div>

        {/* Display Preference */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Default Display Preference
          </label>
          <div className="flex gap-3">
            {(["AMHARIC", "ENGLISH"] as const).map((pref) => (
              <label key={pref} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="displayPreference"
                  value={pref}
                  defaultChecked={defaults.displayPreference === pref}
                  className="accent-emerald-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {pref === "AMHARIC" ? "አማርኛ (Amharic)" : "English"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* PIN */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
          <label htmlFor="pin" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Member PIN{" "}
            <span className="font-normal text-gray-400">
              ({hasPinSet ? "set — enter new 4-digit number to change" : "not set — enter 4 digits to set"})
            </span>
          </label>
          <input
            id="pin"
            name="pin"
            type="password"
            maxLength={4}
            placeholder={hasPinSet ? "••••" : "Set 4-digit PIN"}
            autoComplete="off"
            inputMode="numeric"
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow font-mono tracking-widest"
          />
          {!hasPinSet && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
              ⚠ No PIN set — member cannot log in until you set one
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Leave blank to keep the existing PIN unchanged.
          </p>
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
            {pending ? "Saving…" : "Save Changes"}
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
  );
}
