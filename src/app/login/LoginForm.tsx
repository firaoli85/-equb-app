"use client";

import { useActionState, useState, useEffect, useTransition } from "react";
import { requestOtp, verifyOtp } from "@/actions/otp";

const initialPhoneState = { error: undefined as string | undefined, sent: false, phone: undefined as string | undefined };
const initialOtpState   = { error: undefined as string | undefined };

const OTP_TTL = 600; // Twilio Verify codes expire after 10 minutes

// "+13015416005" → "(301) 541-6005"
function friendlyPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  const local = digits.slice(-10);
  if (local.length !== 10) return e164;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function LoginForm() {
  const [phoneState, phoneAction, phonePending] = useActionState(requestOtp, initialPhoneState);
  const [otpState, otpAction, otpPending]       = useActionState(verifyOtp, initialOtpState);

  const [resentMsg, setResentMsg]   = useState<string | null>(null);
  const [isResending, startResend]  = useTransition();
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL);

  const step  = phoneState.sent ? 2 : 1;
  const phone = phoneState.phone ?? "";

  // Start/reset countdown when we enter step 2
  useEffect(() => {
    if (step !== 2) return;
    setSecondsLeft(OTP_TTL);
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [step, phone]); // re-start when phone changes (resend)

  function handleResend() {
    setResentMsg(null);
    const fd = new FormData();
    fd.set("phone", phone);
    startResend(async () => {
      const result = await requestOtp({}, fd);
      if (result.error) {
        setResentMsg(`Error: ${result.error}`);
      } else {
        setSecondsLeft(OTP_TTL);
        setResentMsg("New code sent!");
        setTimeout(() => setResentMsg(null), 5000);
      }
    });
  }

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
              placeholder="(301) 541-6005"
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

          {/* Confirmation chip */}
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Code sent to {friendlyPhone(phone)}
            </div>
          </div>

          {/* Code input */}
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

            {/* Countdown */}
            <p className={`text-xs mt-1.5 text-center font-mono ${secondsLeft <= 60 ? "text-red-500 dark:text-red-400 font-bold" : "text-gray-400 dark:text-gray-600"}`}>
              {secondsLeft > 0
                ? `Code expires in ${formatSeconds(secondsLeft)}`
                : "Code expired — please resend"}
            </p>
          </div>

          {otpState.error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
              {otpState.error}
            </p>
          )}

          <button
            type="submit"
            disabled={otpPending || secondsLeft === 0}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-base shadow-sm"
            style={{ touchAction: "manipulation" }}
          >
            {otpPending ? "Verifying…" : "Verify & Login"}
          </button>

          {/* Resend */}
          <div className="text-center space-y-2">
            {resentMsg ? (
              <span className={`text-xs font-medium ${resentMsg.startsWith("Error") ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {resentMsg}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                style={{ touchAction: "manipulation" }}
                className="text-xs text-gray-400 dark:text-gray-600 hover:text-emerald-600 dark:hover:text-emerald-400 underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                {isResending ? "Sending…" : "Didn't receive it? Resend code"}
              </button>
            )}

            <div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                ← Use a different phone number
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
