"use client";

import { useActionState, useState, useTransition, useEffect } from "react";
import { lookupPhone, verifyMemberPin, setInitialPinByPhone } from "@/actions/pin-login";
import { SetPinPad } from "@/components/member/SetPinPad";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";

const initialState = {
  error: undefined as string | undefined,
  found: false,
  phone: undefined as string | undefined,
  hasPin: undefined as boolean | undefined,
  displayPhone: undefined as string | undefined,
  nameEnglishFirst: undefined as string | null | undefined,
  nameAmharic: undefined as string | null | undefined,
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
  const [authChoice, setAuthChoice]       = useState<"none" | "pin" | "sms" | "whatsapp">("none");

  // PIN state
  const [pin, setPin]                     = useState("");
  const [pinError, setPinError]           = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft]   = useState<number | null>(null);
  const [locked, setLocked]               = useState(false);
  const [lockedMinutes, setLockedMinutes] = useState(0);
  const [isVerifying, startVerify]        = useTransition();
  const [needsSetPin, setNeedsSetPin]     = useState(false);

  // WhatsApp OTP state
  const [waStep, setWaStep]   = useState<"idle" | "sending" | "code-sent" | "verifying">("idle");
  const [waCode, setWaCode]   = useState("");
  const [waError, setWaError] = useState<string | null>(null);

  // SMS OTP state
  const [smsStep, setSmsStep]                       = useState<"idle" | "sending" | "code-sent" | "verifying">("idle");
  const [smsCode, setSmsCode]                       = useState("");
  const [smsError, setSmsError]                     = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier]   = useState<RecaptchaVerifier | null>(null);

  const [deviceScreen, setDeviceScreen] = useState("");
  const [deviceLang, setDeviceLang]     = useState("");

  useEffect(() => {
    setDeviceScreen(`${window.screen.width}x${window.screen.height}`);
    setDeviceLang(navigator.language);
  }, []);

  const phone        = phoneState.phone ?? "";
  const displayPhone = phoneState.displayPhone ?? "";
  const phoneFound   = phoneState.found && !overridePhone;

  // Welcome name: "Firaoli / ፍቃዱ" — both if available, otherwise whichever exists
  const nameEn = phoneState.nameEnglishFirst ?? "";
  const nameAm = phoneState.nameAmharic ?? "";
  const welcomeName = nameEn && nameAm
    ? `${nameEn} / ${nameAm}`
    : nameEn || nameAm || "Member";
  const avatarInitial = [...(nameEn || nameAm || "?")][0] ?? "?";

  // ── Helpers ───────────────────────────────────────────────────────────────

  function resetToPhone() {
    setOverridePhone(true);
    setAuthChoice("none");
    setNeedsSetPin(false);
    setPin(""); setPinError(null); setAttemptsLeft(null); setLocked(false);
    setSmsStep("idle"); setSmsCode(""); setSmsError(null); setConfirmationResult(null);
    setWaStep("idle"); setWaCode(""); setWaError(null);
  }

  function handlePhoneAction(formData: FormData) {
    setOverridePhone(false);
    setAuthChoice("none");
    setNeedsSetPin(false);
    setPin(""); setPinError(null); setAttemptsLeft(null); setLocked(false);
    setSmsStep("idle"); setSmsCode(""); setSmsError(null); setConfirmationResult(null);
    setWaStep("idle"); setWaCode(""); setWaError(null);
    phoneAction(formData);
  }

  function backToOptions() {
    setAuthChoice("none");
    setNeedsSetPin(false);
    setPin(""); setPinError(null);
    setSmsStep("idle"); setSmsCode(""); setSmsError(null); setConfirmationResult(null);
    setWaStep("idle"); setWaCode(""); setWaError(null);
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
      } else if (result?.noPin) {
        setPin(""); setPinError(null); setAttemptsLeft(null);
        setNeedsSetPin(true);
      }
    });
  }

  // ── SMS OTP handlers ──────────────────────────────────────────────────────

  function friendlySmsError(error: unknown): string {
    const code = (error as { code?: string })?.code ?? "";
    if (code === "auth/too-many-requests")
      return "Too many attempts. Please wait a few minutes and try again.";
    if (code === "auth/invalid-verification-code")
      return "Incorrect code. Please check and try again.";
    if (code === "auth/code-expired")
      return "Code expired. Please request a new one.";
    if (code === "auth/invalid-phone-number")
      return "Invalid phone number format.";
    return "Something went wrong. Please try again.";
  }

  async function handleSendSms() {
    if (smsStep === "sending" || smsStep === "verifying") return;
    setSmsStep("sending");
    setSmsError(null);
    setSmsCode("");
    try {
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
        setRecaptchaVerifier(null);
      }
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      setRecaptchaVerifier(verifier);
      const result = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmationResult(result);
      setSmsStep("code-sent");
    } catch (err: unknown) {
      setSmsError(friendlySmsError(err));
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
      setSmsError(friendlySmsError(err));
      setSmsStep("code-sent");
      setSmsCode("");
    }
  }

  // ── WhatsApp OTP handlers ─────────────────────────────────────────────────

  async function handleSendWhatsApp() {
    if (waStep === "sending" || waStep === "verifying") return;
    setWaStep("sending");
    setWaError(null);
    setWaCode("");
    try {
      const res = await fetch("/api/auth/whatsapp-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWaError(data.error ?? "Failed to send code.");
        setWaStep("idle");
      } else {
        setWaStep("code-sent");
      }
    } catch {
      setWaError("Failed to send code. Please try again.");
      setWaStep("idle");
    }
  }

  async function handleWaCodeChange(code: string) {
    setWaCode(code);
    if (code.length !== 6 || waStep === "verifying") return;
    setWaStep("verifying");
    setWaError(null);
    try {
      const res = await fetch("/api/auth/whatsapp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, screen: deviceScreen, language: deviceLang }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.redirectTo;
      } else {
        setWaError(data.error ?? "Verification failed.");
        setWaStep("code-sent");
        setWaCode("");
      }
    } catch {
      setWaError("Something went wrong. Please try again.");
      setWaStep("code-sent");
      setWaCode("");
    }
  }

  // ── Shared sub-components ─────────────────────────────────────────────────

  // Verified phone pill — replaces the old dark PhoneChip
  const VerifiedPill = () => (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
      <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
      </svg>
      {displayPhone}
    </span>
  );

  const BackLink = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <div className="text-center pt-4">
      <button
        type="button"
        onClick={onClick}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {label}
      </button>
    </div>
  );

  const ErrorMsg = ({ msg }: { msg: string }) => (
    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
      {msg}
    </p>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── STEP 1 — Phone number ── */}
      {!phoneFound && (
        <>
          {/* Identity block */}
          <div className="flex flex-col items-center gap-3 mb-7">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                Equb
              </h1>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                Sign in to your account
              </p>
            </div>
          </div>

          <form action={handlePhoneAction} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Phone number
              </label>
              <input
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="(555) 000-0000"
                style={{ fontSize: "16px", fontVariantNumeric: "tabular-nums" }}
                className="w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-600 transition-colors"
              />
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                Use the number you registered with your Equb
              </p>
            </div>

            {phoneState.error && <ErrorMsg msg={phoneState.error} />}

            <button
              type="submit"
              disabled={phonePending}
              style={{ touchAction: "manipulation" }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
            >
              {phonePending ? "Looking up…" : "Continue"}
            </button>
          </form>
        </>
      )}

      {/* ── STEP 2 — Method picker ── */}
      {phoneFound && authChoice === "none" && (
        <div>
          {/* Welcome header */}
          <div className="flex flex-col items-center gap-2 mb-5">
            <div
              className="w-10 h-10 rounded-full bg-blue-200/60 dark:bg-white/15 flex items-center justify-center select-none"
              aria-hidden="true"
            >
              <span className="text-base font-black text-blue-800 dark:text-white leading-none">
                {avatarInitial}
              </span>
            </div>
            <div className="text-center">
              <p className="text-base font-black text-gray-900 dark:text-white leading-tight" style={{ textWrap: "balance" } as React.CSSProperties}>
                Welcome back, {welcomeName}
              </p>
              <div className="flex justify-center mt-1.5">
                <VerifiedPill />
              </div>
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            Choose how to sign in
          </p>

          <div className="space-y-2">
            {/* PIN — accent-bordered, recommended */}
            <button
              type="button"
              onClick={() => setAuthChoice("pin")}
              style={{ touchAction: "manipulation", minHeight: "56px" }}
              className="w-full flex items-center gap-3 px-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
            >
              <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Enter my PIN</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">4-digit code · fastest</p>
              </div>
              <svg className="w-4 h-4 text-indigo-400 dark:text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* SMS — neutral */}
            <button
              type="button"
              onClick={() => { setAuthChoice("sms"); handleSendSms(); }}
              style={{ touchAction: "manipulation", minHeight: "56px" }}
              className="w-full flex items-center gap-3 px-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Send SMS code</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">6-digit code by text</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* WhatsApp — neutral */}
            <button
              type="button"
              onClick={() => { setAuthChoice("whatsapp"); handleSendWhatsApp(); }}
              style={{ touchAction: "manipulation", minHeight: "56px" }}
              className="w-full flex items-center gap-3 px-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Send WhatsApp code</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">6-digit code by WhatsApp</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <BackLink label="← Use a different number" onClick={resetToPhone} />
        </div>
      )}

      {/* ── STEP 3a-ii — Create PIN (cycle-reset member) ── */}
      {phoneFound && authChoice === "pin" && needsSetPin && (
        <div>
          <div className="flex justify-center mb-4">
            <VerifiedPill />
          </div>
          <div className="text-center mb-5 space-y-1">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 rounded-2xl mb-2">
              <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Create your PIN</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">A new Equb cycle has started. Choose a 4-digit PIN to continue.</p>
          </div>
          <SetPinPad
            theme="light"
            onSubmit={async (pin) => {
              const result = await setInitialPinByPhone(phone, pin, pin, deviceScreen, deviceLang);
              return result;
            }}
          />
          <BackLink label="← Back to sign-in options" onClick={backToOptions} />
        </div>
      )}

      {/* ── STEP 3a — PIN pad ── */}
      {phoneFound && authChoice === "pin" && !needsSetPin && (
        <div>
          <div className="flex justify-center mb-5">
            <VerifiedPill />
          </div>

          {locked ? (
            <div className="text-center py-5 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">Too many attempts.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Try again in {lockedMinutes} minute{lockedMinutes !== 1 ? "s" : ""}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enter your 4-digit PIN</p>
                <div className="flex justify-center gap-5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                        pin.length > i
                          ? "bg-indigo-600 border-indigo-600 scale-110"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    />
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

              <div className="grid grid-cols-3 gap-2.5">
                {PAD_ROWS.flat().map((key, idx) => {
                  if (key === "") return <div key={idx} />;
                  const isBackspace = key === "⌫";
                  const disabled = isVerifying || (isBackspace ? pin.length === 0 : pin.length >= 4);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => isBackspace ? handleBackspace() : handleDigit(key)}
                      disabled={disabled}
                      style={{ touchAction: "manipulation" }}
                      className="flex items-center justify-center h-14 rounded-2xl text-xl font-bold transition-colors active:scale-95 disabled:opacity-40 select-none text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
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

          <BackLink label="← Back to sign-in options" onClick={backToOptions} />
        </div>
      )}

      {/* ── STEP 3b — SMS code entry ── */}
      {phoneFound && authChoice === "sms" && (
        <div>
          <div className="flex justify-center mb-4">
            <VerifiedPill />
          </div>

          <div className="space-y-3">
            {smsStep === "sending" ? (
              <div className="flex flex-col items-center gap-3 py-5">
                <svg className="w-7 h-7 text-indigo-400 dark:text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-gray-400 dark:text-gray-500">Sending code…</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl px-3 py-2.5">
                  <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Code sent to your phone</p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">Check your texts for a 6-digit code</p>
                  </div>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={smsCode}
                  onChange={(e) => handleSmsCodeChange(e.target.value.replace(/\D/g, ""))}
                  disabled={smsStep === "verifying"}
                  autoFocus
                  placeholder="000000"
                  autoComplete="one-time-code"
                  style={{ fontSize: "28px", letterSpacing: "0.5em", textAlign: "center" }}
                  className="w-full px-4 py-3 font-mono rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-600 transition-colors disabled:opacity-50"
                />

                {smsStep === "verifying" && (
                  <p className="text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse">Verifying…</p>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSendSms}
                    disabled={smsStep === "verifying"}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors"
                  >
                    Resend code
                  </button>
                </div>
              </>
            )}

            {smsError && <ErrorMsg msg={smsError} />}
          </div>

          <BackLink label="← Back to sign-in options" onClick={backToOptions} />
        </div>
      )}

      {/* ── STEP 3c — WhatsApp code entry ── */}
      {phoneFound && authChoice === "whatsapp" && (
        <div>
          <div className="flex justify-center mb-4">
            <VerifiedPill />
          </div>

          <div className="space-y-3">
            {waStep === "sending" ? (
              <div className="flex flex-col items-center gap-3 py-5">
                <svg className="w-7 h-7 text-emerald-500 dark:text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-gray-400 dark:text-gray-500">Sending WhatsApp code…</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl px-3 py-2.5">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Code sent to WhatsApp</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Check WhatsApp for your 6-digit code</p>
                  </div>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={waCode}
                  onChange={(e) => handleWaCodeChange(e.target.value.replace(/\D/g, ""))}
                  disabled={waStep === "verifying"}
                  autoFocus
                  placeholder="000000"
                  autoComplete="one-time-code"
                  style={{ fontSize: "28px", letterSpacing: "0.5em", textAlign: "center" }}
                  className="w-full px-4 py-3 font-mono rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-600 transition-colors disabled:opacity-50"
                />

                {waStep === "verifying" && (
                  <p className="text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse">Verifying…</p>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    disabled={waStep === "verifying"}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors"
                  >
                    Resend code
                  </button>
                </div>
              </>
            )}

            {waError && <ErrorMsg msg={waError} />}
          </div>

          <BackLink label="← Back to sign-in options" onClick={backToOptions} />
        </div>
      )}

      {/* Always in DOM so Firebase can find it at any step */}
      <div id="recaptcha-container" />
    </>
  );
}
