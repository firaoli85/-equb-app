"use client";

import { useActionState, useState, useTransition, useEffect, useRef, useCallback } from "react";
import { lookupPhone, verifyMemberPin } from "@/actions/pin-login";
import { sendOtp, verifyOtp } from "@/actions/otp";

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

type LoginMethod = "pin" | "whatsapp" | "sms" | null;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function LoginForm() {
  const [phoneState, phoneAction, phonePending] = useActionState(lookupPhone, initialState);

  // Navigation
  const [overridePhone, setOverridePhone] = useState(false);
  const [loginMethod, setLoginMethod]     = useState<LoginMethod>(null);

  // PIN state
  const [pin, setPin]                     = useState("");
  const [pinError, setPinError]           = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft]   = useState<number | null>(null);
  const [locked, setLocked]               = useState(false);
  const [lockedMinutes, setLockedMinutes] = useState(0);
  const [isVerifyingPin, startVerifyPin]  = useTransition();

  // OTP state — isSendingOtp uses plain useState (not useTransition) so state
  // updates after the async send always commit and the UI always transitions.
  const [otpSent, setOtpSent]           = useState(false);
  const [otpCode, setOtpCode]           = useState("");
  const [otpError, setOtpError]         = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, startVerifyOtp] = useTransition();
  const otpInputRef    = useRef<HTMLInputElement>(null);
  // Synchronous ref guard — prevents Enter-key + button-click from both firing
  // before React re-renders with the new isPending state.
  const isSubmittingRef = useRef(false);

  // Device info for session fingerprint
  const [deviceScreen, setDeviceScreen] = useState("");
  const [deviceLang, setDeviceLang]     = useState("");

  useEffect(() => {
    setDeviceScreen(`${window.screen.width}x${window.screen.height}`);
    setDeviceLang(navigator.language);
  }, []);

  // Auto-focus OTP input when step 3b mounts
  useEffect(() => {
    if (otpSent) setTimeout(() => otpInputRef.current?.focus(), 100);
  }, [otpSent]);

  const phone        = phoneState.phone ?? "";
  const displayPhone = phoneState.displayPhone ?? "";
  const hasPin       = phoneState.hasPin;
  const phoneFound   = phoneState.found && !overridePhone;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function clearOtpState() {
    setOtpSent(false);
    setOtpCode("");
    setOtpError(null);
    setHasAttempted(false);
    isSubmittingRef.current = false;
  }

  function resetToPhone() {
    setOverridePhone(true);
    setLoginMethod(null);
    setPin(""); setPinError(null); setAttemptsLeft(null); setLocked(false);
    clearOtpState();
  }

  function backToMethodPicker() {
    setLoginMethod(null);
    setPin(""); setPinError(null);
    clearOtpState();
  }

  function handlePhoneAction(formData: FormData) {
    setOverridePhone(false);
    setLoginMethod(null);
    setPin(""); setPinError(null); setAttemptsLeft(null); setLocked(false);
    clearOtpState();
    phoneAction(formData);
  }

  // ── OTP send (plain async — never wrapped in startTransition) ─────────────

  async function handleSendOtp(channel: "whatsapp" | "sms") {
    clearOtpState();
    setIsSendingOtp(true);
    try {
      const result = await sendOtp(phone, channel);
      if (result.error) {
        setOtpError(result.error);
      } else {
        setLoginMethod(channel);
        setOtpSent(true);
      }
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleResendOtp() {
    if (!loginMethod || loginMethod === "pin") return;
    const channel = loginMethod as "whatsapp" | "sms";
    clearOtpState();
    setIsSendingOtp(true);
    try {
      const result = await sendOtp(phone, channel);
      if (result.error) {
        setOtpError(result.error);
      } else {
        setOtpSent(true);
      }
    } finally {
      setIsSendingOtp(false);
    }
  }

  // ── OTP verify ────────────────────────────────────────────────────────────

  const handleOtpVerify = useCallback(() => {
    if (isSubmittingRef.current) return;
    if (otpCode.length < 6) {
      setHasAttempted(true);
      setOtpError("Please enter the full 6-digit code.");
      return;
    }
    isSubmittingRef.current = true;
    setHasAttempted(true);
    setOtpError(null);
    startVerifyOtp(async () => {
      try {
        const result = await verifyOtp(phone, otpCode, deviceScreen, deviceLang);
        if (result?.error) {
          setOtpError(result.error);
          setOtpCode("");
          if (result.expired) {
            // Go back to method picker; clear everything so no error bleeds through
            setOtpError(null);
            setHasAttempted(false);
            setOtpSent(false);
            setLoginMethod(null);
          }
        }
      } finally {
        isSubmittingRef.current = false;
      }
    });
  }, [otpCode, phone, deviceScreen, deviceLang]);

  // ── PIN ───────────────────────────────────────────────────────────────────

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

  // ── Shared sub-components ─────────────────────────────────────────────────

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

  const BackToPhone = () => (
    <div className="text-center pt-2">
      <button type="button" onClick={resetToPhone}
        className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
        ← Use a different phone number
      </button>
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
  // STEP 2 — Choose login method
  // ─────────────────────────────────────────────────────────────────────────

  if (!loginMethod && !otpSent) {
    return (
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-3">
        <PhoneChip />

        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center mb-1">
          How would you like to sign in?
        </p>

        {/* Option 1 — PIN */}
        <button
          type="button"
          onClick={() => setLoginMethod("pin")}
          disabled={hasPin === false || isSendingOtp}
          style={{ touchAction: "manipulation", minHeight: "56px" }}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c1c] hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left group"
        >
          <span className="text-2xl shrink-0">🔐</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Enter my PIN</p>
            {hasPin === false ? (
              <p className="text-xs text-amber-500 dark:text-amber-400 mt-0.5">No PIN set — contact your Equb manager</p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">4-digit ATM-style PIN</p>
            )}
          </div>
          <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Option 2 — WhatsApp */}
        <button
          type="button"
          onClick={() => handleSendOtp("whatsapp")}
          disabled={isSendingOtp}
          style={{ touchAction: "manipulation", minHeight: "56px" }}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-[#25D366]/40 bg-[#25D366]/5 hover:bg-[#25D366]/10 hover:border-[#25D366]/70 disabled:opacity-60 disabled:cursor-wait transition-all text-left group"
        >
          <span className="shrink-0 text-[#25D366]">
            <WhatsAppIcon className="w-7 h-7" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {isSendingOtp ? "Sending code…" : "Send WhatsApp code"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {isSendingOtp ? "Please wait" : "One-time code via WhatsApp"}
            </p>
          </div>
          {isSendingOtp ? (
            <svg className="w-4 h-4 text-[#25D366] animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[#25D366]/40 shrink-0 group-hover:text-[#25D366]/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>

        {/* Option 3 — SMS (disabled, pending A2P approval) */}
        <button
          type="button"
          disabled
          style={{ touchAction: "manipulation", minHeight: "56px" }}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-50 cursor-not-allowed text-left"
        >
          <span className="text-2xl shrink-0 grayscale">💬</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Send SMS code</p>
              <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                Coming soon
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Pending carrier approval</p>
          </div>
        </button>

        {/* Send error (shown inline on this screen) */}
        {otpError && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900 text-center">
            {otpError}
          </p>
        )}

        <BackToPhone />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3a — PIN pad
  // ─────────────────────────────────────────────────────────────────────────

  if (loginMethod === "pin") {
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

        <div className="text-center pt-4 space-y-2">
          <button type="button" onClick={backToMethodPicker}
            className="block w-full text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
            ← Back to sign-in options
          </button>
          <BackToPhone />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3b — OTP code entry (WhatsApp / SMS)
  // ─────────────────────────────────────────────────────────────────────────

  const channelLabel = loginMethod === "whatsapp" ? "WhatsApp" : "SMS";
  const channelIcon  = loginMethod === "whatsapp"
    ? <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
    : <span className="text-xl">💬</span>;

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">
      <PhoneChip />

      <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-xl px-4 py-3">
        {channelIcon}
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {channelLabel} code sent
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Check your {channelLabel} for a 6-digit code
          </p>
        </div>
      </div>

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
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setOtpCode(v);
            if (hasAttempted) setOtpError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && otpCode.length === 6 && !isSubmittingRef.current) {
              e.preventDefault();
              handleOtpVerify();
            }
          }}
          placeholder="000000"
          style={{ fontSize: "24px", letterSpacing: "0.3em" }}
          className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-center placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono"
          autoComplete="one-time-code"
        />
      </div>

      {hasAttempted && otpError && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900 text-center">
          {otpError}
        </p>
      )}

      <button
        type="button"
        onClick={handleOtpVerify}
        disabled={otpCode.length < 6 || isVerifyingOtp || isSubmittingRef.current}
        style={{ touchAction: "manipulation", minHeight: "52px" }}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-base shadow-sm"
      >
        {isVerifyingOtp ? "Verifying…" : "Verify Code"}
      </button>

      <div className="text-center">
        {isSendingOtp ? (
          <p className="text-xs text-gray-400 animate-pulse">Sending new code…</p>
        ) : (
          <button type="button" onClick={handleResendOtp}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline transition-opacity">
            Didn&apos;t receive it? Resend code
          </button>
        )}
      </div>

      <div className="text-center space-y-1.5">
        <button type="button" onClick={backToMethodPicker}
          className="block w-full text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
          ← Back to sign-in options
        </button>
        <BackToPhone />
      </div>
    </div>
  );
}
