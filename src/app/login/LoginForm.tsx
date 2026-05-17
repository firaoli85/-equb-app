"use client";

import { useActionState, useState } from "react";
import { requestOtp, verifyOtp } from "@/actions/otp";

const initialPhoneState = { error: undefined, sent: false, phone: undefined };
const initialOtpState = { error: undefined };

export function LoginForm() {
  const [phoneState, phoneAction, phonePending] = useActionState(requestOtp, initialPhoneState);
  const [otpState, otpAction, otpPending] = useActionState(verifyOtp, initialOtpState);
  const [resent, setResent] = useState(false);

  const step = phoneState.sent ? 2 : 1;
  const phone = phoneState.phone ?? "";

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
      {step === 1 ? (
        /* ── Step 1: Phone number ───────────────────────── */
        <form action={phoneAction} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="+1 (555) 000-0000"
              style={{ fontSize: "16px" }}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          {phoneState.error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
              {phoneState.error}
            </p>
          )}

          <button
            type="submit"
            disabled={phonePending}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-base shadow-sm"
            style={{ touchAction: "manipulation" }}
          >
            {phonePending ? "Sending…" : "Send Login Code"}
          </button>
        </form>
      ) : (
        /* ── Step 2: OTP code ───────────────────────────── */
        <form action={otpAction} className="space-y-4">
          <input type="hidden" name="phone" value={phone} />

          <div className="text-center mb-2">
            <div className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Code sent to {phone}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              6-Digit Code
            </label>
            <input
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              placeholder="000000"
              autoFocus
              style={{ fontSize: "24px", letterSpacing: "0.25em", textAlign: "center" }}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono font-bold"
            />
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1.5 text-center">
              Code expires in 10 minutes
            </p>
          </div>

          {otpState.error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
              {otpState.error}
            </p>
          )}

          <button
            type="submit"
            disabled={otpPending}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-base shadow-sm"
            style={{ touchAction: "manipulation" }}
          >
            {otpPending ? "Verifying…" : "Verify & Login"}
          </button>

          <div className="text-center">
            {resent ? (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">New code sent!</span>
            ) : (
              <form
                action={async (fd) => {
                  // Re-use phoneAction with the stored phone
                  fd.set("phone", phone);
                  await phoneAction(fd);
                  setResent(true);
                  setTimeout(() => setResent(false), 5000);
                }}
                className="inline"
              >
                <button
                  type="submit"
                  className="text-xs text-gray-400 dark:text-gray-600 hover:text-emerald-600 dark:hover:text-emerald-400 underline underline-offset-2 transition-colors"
                >
                  Didn&apos;t receive it? Resend code
                </button>
              </form>
            )}
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          >
            ← Use a different phone number
          </button>
        </form>
      )}
    </div>
  );
}
