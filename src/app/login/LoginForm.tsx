"use client";

import { useActionState, useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { lookupPhone, verifyMemberPin } from "@/actions/pin-login";

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

type AuthMode = "pin" | "otp-choose" | "otp-sending" | "otp-ready";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [phoneState, phoneAction, phonePending] = useActionState(lookupPhone, initialState);

  const [overridePhone, setOverridePhone] = useState(false);

  // PIN state
  const [pin, setPin]                     = useState("");
  const [pinError, setPinError]           = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft]   = useState<number | null>(null);
  const [locked, setLocked]               = useState(false);
  const [lockedMinutes, setLockedMinutes] = useState(0);
  const [isVerifyingPin, startVerifyPin]  = useTransition();

  // OTP state
  const [authMode, setAuthMode]         = useState<AuthMode>("pin");
  const [otpChannel, setOtpChannel]     = useState<"whatsapp" | "sms" | null>(null);
  const [otpCode, setOtpCode]           = useState("");
  const [otpError, setOtpError]         = useState<string | null>(null);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const otpInputRef    = useRef<HTMLInputElement>(null);
  // Synchronous guard — prevents Enter-key + button-click both firing before
  // the React re-render from setOtpVerifying(true) is committed.
  const otpSubmitGuard = useRef(false);

  // Device info for session fingerprint
  const [deviceScreen, setDeviceScreen] = useState("");
  const [deviceLang, setDeviceLang]     = useState("");

  useEffect(() => {
    setDeviceScreen(`${window.screen.width}x${window.screen.height}`);
    setDeviceLang(navigator.language);
  }, []);

  // Focus OTP input as soon as it appears
  useEffect(() => {
    if (authMode === "otp-ready") {
      setTimeout(() => otpInputRef.current?.focus(), 80);
    }
  }, [authMode]);

  const phone        = phoneState.phone ?? "";
  const displayPhone = phoneState.displayPhone ?? "";
  const phoneFound   = phoneState.found && !overridePhone;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function resetToPhone() {
    setOverridePhone(true);
    setPin(""); setPinError(null); setAttemptsLeft(null); setLocked(false);
    setAuthMode("pin"); setOtpChannel(null); setOtpCode(""); setOtpError(null);
    otpSubmitGuard.current = false;
  }

  function handlePhoneAction(formData: FormData) {
    setOverridePhone(false);
    setPin(""); setPinError(null); setAttemptsLeft(null); setLocked(false);
    setAuthMode("pin"); setOtpChannel(null); setOtpCode(""); setOtpError(null);
    otpSubmitGuard.current = false;
    phoneAction(formData);
  }

  // ── PIN handlers ──────────────────────────────────────────────────────────

  function handleDigit(d: string) {
    if (pin.length >= 4 || isVerifyingPin || locked) return;
    const next = pin + d;
    setPin(next);
    setPinError(null); setAttemptsLeft(null);
    if (next.length === 4) submitPin(next);
  }

  function handleBackspace() {
    if (isVerifyingPin) return;
    setPin((p) => p.slice(0, -1));
    setPinError(null);
  }

  function submitPin(pinValue: string) {
    startVerifyPin(async () => {
      const result = await verifyMemberPin(phone, pinValue, deviceScreen, deviceLang);
      if (result?.locked) {
        setLocked(true); setLockedMinutes(result.lockedMinutes ?? 30); setPin("");
      } else if (result?.error) {
        setPinError(result.error); setAttemptsLeft(result.attemptsLeft ?? null); setPin("");
      }
    });
  }

  // ── OTP handlers ──────────────────────────────────────────────────────────

  async function handleSendOtp(channel: "whatsapp" | "sms") {
    setOtpChannel(channel);
    setOtpCode(""); setOtpError(null);
    otpSubmitGuard.current = false;
    setAuthMode("otp-sending");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, channel }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setOtpError(data.error ?? "Failed to send code. Please try again.");
        setAuthMode("otp-choose");
      } else {
        setAuthMode("otp-ready");
      }
    } catch {
      setOtpError("Network error. Please try again.");
      setAuthMode("otp-choose");
    }
  }

  async function handleVerifyOtp() {
    if (otpSubmitGuard.current) return;
    if (otpCode.length < 6) { setOtpError("Please enter the full 6-digit code."); return; }
    otpSubmitGuard.current = true;
    setOtpVerifying(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otpCode, screen: deviceScreen, language: deviceLang }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setOtpError(data.error ?? "Invalid or expired code.");
        setOtpCode("");
        otpSubmitGuard.current = false;
      } else {
        router.push(data.redirectTo);
      }
    } catch {
      setOtpError("Network error. Please try again.");
      setOtpCode("");
      otpSubmitGuard.current = false;
    } finally {
      setOtpVerifying(false);
    }
  }

  // ── Shared pieces ─────────────────────────────────────────────────────────

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
  // STEP 2a — PIN pad (default)
  // ─────────────────────────────────────────────────────────────────────────

  if (authMode === "pin") {
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
                const disabled = isVerifyingPin || (isBackspace ? pin.length === 0 : pin.length >= 4);
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

            {isVerifyingPin && (
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse">Verifying…</p>
            )}
          </div>
        )}

        <div className="text-center pt-5 space-y-2">
          <button type="button" onClick={() => setAuthMode("otp-choose")}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline transition-colors">
            Send a verification code instead
          </button>
          <div>
            <button type="button" onClick={resetToPhone}
              className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
              ← Use a different phone number
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2b — Choose OTP channel
  // ─────────────────────────────────────────────────────────────────────────

  if (authMode === "otp-choose" || authMode === "otp-sending") {
    const sending = authMode === "otp-sending";
    return (
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-3">
        <PhoneChip />

        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center mb-1">
          Send a one-time code to:
        </p>

        {/* WhatsApp */}
        <button
          type="button"
          onClick={() => !sending && handleSendOtp("whatsapp")}
          disabled={sending}
          style={{ touchAction: "manipulation", minHeight: "56px" }}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-[#25D366]/40 bg-[#25D366]/5 hover:bg-[#25D366]/10 hover:border-[#25D366]/70 disabled:opacity-60 disabled:cursor-wait transition-all text-left group"
        >
          <span className="shrink-0 text-[#25D366]">
            <WhatsAppIcon className="w-7 h-7" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {sending && otpChannel === "whatsapp" ? "Sending…" : "WhatsApp"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">6-digit code via WhatsApp</p>
          </div>
          {sending && otpChannel === "whatsapp" ? (
            <svg className="w-4 h-4 text-[#25D366] animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 group-hover:text-[#25D366]/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>

        {/* SMS — disabled pending A2P approval */}
        <button
          type="button"
          disabled
          style={{ touchAction: "manipulation", minHeight: "56px" }}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-50 cursor-not-allowed text-left"
        >
          <span className="text-2xl shrink-0 grayscale">💬</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">SMS</p>
              <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                Coming soon
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Pending carrier approval</p>
          </div>
        </button>

        {otpError && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900 text-center">
            {otpError}
          </p>
        )}

        <div className="text-center space-y-2 pt-1">
          <button type="button" onClick={() => { setAuthMode("pin"); setOtpError(null); }}
            className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
            ← Back to PIN
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2c — OTP code entry
  // ─────────────────────────────────────────────────────────────────────────

  const channelLabel = otpChannel === "whatsapp" ? "WhatsApp" : "SMS";

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">
      <PhoneChip />

      {/* Sent confirmation banner */}
      <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-xl px-4 py-3">
        {otpChannel === "whatsapp" ? (
          <WhatsAppIcon className="w-5 h-5 text-[#25D366] shrink-0" />
        ) : (
          <span className="text-xl shrink-0">💬</span>
        )}
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {channelLabel} code sent
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Check your {channelLabel} for a 6-digit code
          </p>
        </div>
      </div>

      {/* Code input */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Enter 6-digit code
        </label>
        <input
          ref={otpInputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={otpCode}
          onChange={(e) => {
            setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setOtpError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && otpCode.length === 6 && !otpSubmitGuard.current) {
              e.preventDefault();
              handleVerifyOtp();
            }
          }}
          placeholder="000000"
          style={{ fontSize: "24px", letterSpacing: "0.3em" }}
          className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-center placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono"
          autoComplete="one-time-code"
        />
      </div>

      {otpError && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900 text-center">
          {otpError}
        </p>
      )}

      <button
        type="button"
        onClick={handleVerifyOtp}
        disabled={otpCode.length < 6 || otpVerifying}
        style={{ touchAction: "manipulation", minHeight: "52px" }}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-base shadow-sm"
      >
        {otpVerifying ? "Verifying…" : "Verify Code"}
      </button>

      {/* Resend + back */}
      <div className="text-center space-y-2">
        <button type="button"
          onClick={() => { setOtpCode(""); setOtpError(null); handleSendOtp(otpChannel!); }}
          disabled={otpVerifying}
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 transition-opacity">
          Didn&apos;t receive it? Resend code
        </button>
        <div>
          <button type="button" onClick={() => { setAuthMode("otp-choose"); setOtpCode(""); setOtpError(null); otpSubmitGuard.current = false; }}
            className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
