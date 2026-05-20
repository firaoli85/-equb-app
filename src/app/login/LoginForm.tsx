"use client";

import { useActionState, useState, useTransition, useEffect } from "react";
import { lookupPhone, verifyMemberPin } from "@/actions/pin-login";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";

const initialState = {
  error: undefined as string | undefined,
  found: false,
  phone: undefined as string | undefined,
  hasPin: undefined as boolean | undefined,
  displayPhone: undefined as string | undefined,
};

const PAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["",  "0", "⌫"],
];

export function LoginForm() {
  const [phoneState, phoneAction, phonePending] = useActionState(lookupPhone, initialState);

  const [overridePhone, setOverridePhone] = useState(false);

  // PIN state
  const [pin, setPin]                     = useState("");
  const [pinError, setPinError]           = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft]   = useState<number | null>(null);
  const [locked, setLocked]               = useState(false);
  const [lockedMinutes, setLockedMinutes] = useState(0);
  const [isVerifying, startVerify]        = useTransition();

  // SMS OTP state
  const [smsStep, setSmsStep]                         = useState<"idle" | "sending" | "code-sent" | "verifying">("idle");
  const [smsCode, setSmsCode]                         = useState("");
  const [smsError, setSmsError]                       = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult]   = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier]     = useState<RecaptchaVerifier | null>(null);

  // Device info for session fingerprint
  const [deviceScreen, setDeviceScreen] = useState("");
  const [deviceLang, setDeviceLang]     = useState("");

  useEffect(() => {
    setDeviceScreen(`${window.screen.width}x${window.screen.height}`);
    setDeviceLang(navigator.language);
  }, []);

  const phone        = phoneState.phone ?? "";
  const displayPhone = phoneState.displayPhone ?? "";
  const phoneFound   = phoneState.found && !overridePhone;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function resetToPhone() {
    setOverridePhone(true);
    setPin(""); setPinError(null); setAttemptsLeft(null); setLocked(false);
    setSmsStep("idle"); setSmsCode(""); setSmsError(null); setConfirmationResult(null);
  }

  function handlePhoneAction(formData: FormData) {
    setOverridePhone(false);
    setPin(""); setPinError(null); setAttemptsLeft(null); setLocked(false);
    setSmsStep("idle"); setSmsCode(""); setSmsError(null); setConfirmationResult(null);
    phoneAction(formData);
  }

  // ── PIN handlers ──────────────────────────────────────────────────────────

  function handleDigit(d: string) {
    if (pin.length >= 4 || isVerifying || locked) return;
    const next = pin + d;
    setPin(next);
    setPinError(null); setAttemptsLeft(null);
    if (next.length === 4) submitPin(next);
  }

  function handleBackspace() {
    if (isVerifying) return;
    setPin((p) => p.slice(0, -1));
    setPinError(null);
  }

  function submitPin(pinValue: string) {
    startVerify(async () => {
      const result = await verifyMemberPin(phone, pinValue, deviceScreen, deviceLang);
      if (result?.locked) {
        setLocked(true); setLockedMinutes(result.lockedMinutes ?? 30); setPin("");
      } else if (result?.error) {
        setPinError(result.error); setAttemptsLeft(result.attemptsLeft ?? null); setPin("");
      }
    });
  }

  // ── SMS OTP handlers ──────────────────────────────────────────────────────

  async function handleSendSms() {
    if (smsStep === "sending" || smsStep === "verifying") return;
    setSmsStep("sending");
    setSmsError(null);
    setSmsCode("");
    try {
      if (recaptchaVerifier) recaptchaVerifier.clear();
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      setRecaptchaVerifier(verifier);
      const result = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmationResult(result);
      setSmsStep("code-sent");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send SMS.";
      setSmsError(msg);
      setSmsStep("idle");
    }
  }

  async function handleSmsCodeChange(code: string) {
    setSmsCode(code);
    if (code.length !== 6 || !confirmationResult || smsStep === "verifying") return;
    setSmsStep("verifying");
    setSmsError(null);
    try {
      await confirmationResult.confirm(code);
      const res = await fetch("/api/auth/firebase-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, screen: deviceScreen, language: deviceLang }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.redirectTo;
      } else {
        setSmsError(data.error ?? "Verification failed.");
        setSmsStep("code-sent");
        setSmsCode("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Incorrect code. Please try again.";
      setSmsError(msg);
      setSmsStep("code-sent");
      setSmsCode("");
    }
  }

  // ── Shared phone chip ─────────────────────────────────────────────────────

  const PhoneChip = () => (
    <div className="flex justify-center mb-5">
      <div className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {displayPhone}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Phone number
  // ─────────────────────────────────────────────────────────────────────────

  if (!phoneFound) {
    return (
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
        <form action={handlePhoneAction} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              name="phone" type="tel" required autoComplete="tel"
              placeholder="Enter your phone number"
              style={{ fontSize: "16px" }}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Use the phone number you registered with your Equb manager
            </p>
          </div>

          {phoneState.error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
              {phoneState.error}
            </p>
          )}

          <button type="submit" disabled={phonePending}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-base shadow-sm"
            style={{ touchAction: "manipulation" }}>
            {phonePending ? "Looking up…" : "Continue"}
          </button>
        </form>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — PIN pad
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
      <PhoneChip />

      {locked ? (
        <div className="text-center py-6 space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 dark:bg-red-950 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">Too many attempts.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Try again in {lockedMinutes} minute{lockedMinutes !== 1 ? "s" : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="text-center space-y-2">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enter your 4-digit PIN</p>
            <div className="flex justify-center gap-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                  pin.length > i ? "bg-emerald-600 border-emerald-600 scale-110" : "border-gray-300 dark:border-gray-600"
                }`} />
              ))}
            </div>
          </div>

          {pinError && (
            <div className="text-center">
              <p className="text-sm text-red-600 dark:text-red-400">{pinError}</p>
              {attemptsLeft !== null && attemptsLeft > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {PAD_ROWS.flat().map((key, idx) => {
              if (key === "") return <div key={idx} />;
              const isBackspace = key === "⌫";
              const disabled = isVerifying || (isBackspace ? pin.length === 0 : pin.length >= 4);
              return (
                <button key={idx} type="button"
                  onClick={() => isBackspace ? handleBackspace() : handleDigit(key)}
                  disabled={disabled}
                  style={{ touchAction: "manipulation" }}
                  className={`flex items-center justify-center h-16 rounded-2xl text-2xl font-bold transition-all active:scale-95 disabled:opacity-40 select-none ${
                    isBackspace
                      ? "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                      : "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-700 dark:hover:text-emerald-300"
                  }`}>
                  {key}
                </button>
              );
            })}
          </div>

          {isVerifying && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse">Verifying…</p>
          )}
        </div>
      )}

      {/* ── SMS OTP ───────────────────────────────────────────────────────── */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {smsStep === "idle" || smsStep === "sending" ? (
          <button
            type="button"
            onClick={handleSendSms}
            disabled={smsStep === "sending"}
            style={{ touchAction: "manipulation" }}
            className="w-full py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {smsStep === "sending" ? "Sending SMS…" : "Send SMS code instead"}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">
              Enter the 6-digit code sent to {displayPhone}
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={smsCode}
              onChange={(e) => handleSmsCodeChange(e.target.value.replace(/\D/g, ""))}
              disabled={smsStep === "verifying"}
              autoFocus
              placeholder="000000"
              style={{ fontSize: "24px", letterSpacing: "0.3em", textAlign: "center" }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:opacity-50"
            />
            {smsStep === "verifying" && (
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse">Verifying…</p>
            )}
            <div className="text-center">
              <button
                type="button"
                onClick={handleSendSms}
                disabled={smsStep === "verifying"}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 transition-colors"
              >
                Resend code
              </button>
            </div>
          </div>
        )}

        {smsError && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
            {smsError}
          </p>
        )}
      </div>

      <div id="recaptcha-container" />

      <div className="text-center pt-5">
        <button type="button" onClick={resetToPhone}
          className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
          ← Use a different phone number
        </button>
      </div>
    </div>
  );
}
