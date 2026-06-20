"use client";

import { useEffect, useState } from "react";
import { setInitialPin } from "@/actions/pin-setup";
import { SetPinPad } from "@/components/member/SetPinPad";

export function SetPinScreen({
  token,
  memberNameEnglish,
}: {
  token: string;
  memberNameEnglish: string;
}) {
  const [screen, setScreen]     = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    setScreen(`${window.screen.width}x${window.screen.height}`);
    setLanguage(navigator.language);
  }, []);

  async function handleSubmit(pin: string): Promise<{ error: string } | void> {
    const result = await setInitialPin(token, pin, pin, screen, language);
    // setInitialPin calls redirect() on success — it has return type `never` for that path,
    // so `result` only exists when there's an error.
    return result;
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0a0a0b] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-5">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 dark:bg-indigo-950 rounded-2xl mb-3">
            <svg
              className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path
                strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Create your PIN
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Hi {memberNameEnglish}! Choose a 4-digit PIN to secure your Equb profile.
          </p>
        </div>

        {/* PIN pad card */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <SetPinPad onSubmit={handleSubmit} theme="light" />
        </div>

        <p className="text-xs text-center text-gray-400 dark:text-gray-600 px-4">
          You'll use this PIN every time you log in. Don't share it with anyone.
        </p>

      </div>
    </div>
  );
}
