// Development-only visual preview of all login states.
// No auth, no DB, no API calls — all states are static JSX.

const PAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["",  "0", "⌫"],
];

// ── Shared icons ─────────────────────────────────────────────────────────────

function SmsIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function PreviewCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-700 text-gray-200 tracking-wide">
          {label}
        </span>
      </div>
      <div className="w-full max-w-[360px]">{children}</div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="text-sm text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

function LoginCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
      {children}
    </div>
  );
}

function PhoneChip() {
  return (
    <div className="flex justify-center mb-5">
      <div className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        (301) 541-6005
      </div>
    </div>
  );
}

function PinDots({ filled }: { filled: number }) {
  return (
    <div className="flex justify-center gap-5">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
            i < filled
              ? "bg-emerald-600 border-emerald-600 scale-110"
              : "border-gray-300 dark:border-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

function PinPad() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {PAD_ROWS.flat().map((key, idx) => {
        if (key === "") return <div key={idx} />;
        const isBackspace = key === "⌫";
        return (
          <div
            key={idx}
            className={`flex items-center justify-center h-16 rounded-2xl text-2xl font-bold select-none ${
              isBackspace
                ? "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
                : "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800"
            }`}
          >
            {key}
          </div>
        );
      })}
    </div>
  );
}

function SmsDivider() {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200 dark:border-gray-700" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-white dark:bg-[#141414] px-2 text-gray-400">or</span>
      </div>
    </div>
  );
}

function SmsButton({ sending }: { sending?: boolean }) {
  return (
    <div
      style={{ minHeight: "56px" }}
      className={`w-full flex items-center gap-3 px-4 rounded-xl border-2 transition-all ${
        sending
          ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <SmsIcon className="w-6 h-6 text-blue-500 shrink-0" />
      <div className="flex-1 text-left">
        <p className="text-sm font-bold text-gray-900 dark:text-white">Send SMS code</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {sending ? "Sending…" : "6-digit code via text message"}
        </p>
      </div>
      {sending ? (
        <svg className="w-5 h-5 text-blue-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );
}

function SmsCodeEntry({ code, verifying }: { code?: string; verifying?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl px-4 py-3">
        <SmsIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-blue-700 dark:text-blue-300">SMS code sent</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Check your texts for a 6-digit code</p>
        </div>
      </div>
      <div
        className="w-full px-4 py-3.5 font-mono rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-center"
        style={{ fontSize: "28px", letterSpacing: "0.5em" }}
      >
        {code ? (
          <span>{code}</span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">000000</span>
        )}
      </div>
      {verifying && (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse">Verifying…</p>
      )}
      <div className="flex justify-center gap-5 text-xs">
        <span className="text-emerald-600 dark:text-emerald-400">Resend code</span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className="text-gray-400 dark:text-gray-500">Back to PIN</span>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPreview() {
  return (
    <div className="min-h-screen bg-gray-950 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-14">

        {/* Header */}
        <div className="border-b border-gray-800 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
              Dev Only
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-2">Login Flow — Visual Preview</h1>
          <p className="text-sm text-gray-500 mt-1">All login states rendered as static JSX. No auth or data required.</p>
          <a href="/login" className="inline-block mt-3 text-xs text-emerald-500 hover:text-emerald-400 underline underline-offset-2">
            → Open real login page
          </a>
        </div>

        {/* ── STATE 1: Phone Entry ────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Step 1 — Phone Entry" sub="Shown before any phone number is confirmed" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

            <PreviewCard label="1a · Empty input">
              <LoginCard>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      readOnly
                      placeholder="Enter your phone number"
                      style={{ fontSize: "16px" }}
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Use the phone number you registered with your Equb manager
                    </p>
                  </div>
                  <button className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl text-base shadow-sm">
                    Continue
                  </button>
                </div>
              </LoginCard>
            </PreviewCard>

            <PreviewCard label="1b · Phone not found error">
              <LoginCard>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      readOnly
                      defaultValue="(555) 000-0000"
                      style={{ fontSize: "16px" }}
                      className="w-full px-4 py-3.5 rounded-xl border border-red-300 dark:border-red-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Use the phone number you registered with your Equb manager
                    </p>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
                    Phone number not registered. Please contact your Equb manager.
                  </p>
                  <button className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl text-base shadow-sm">
                    Continue
                  </button>
                </div>
              </LoginCard>
            </PreviewCard>

          </div>
        </section>

        {/* ── STATE 2: PIN Pad ────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Step 2 — PIN Pad" sub="Shown after phone number is confirmed" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

            <PreviewCard label="2a · 0 dots filled (default)">
              <LoginCard>
                <PhoneChip />
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enter your 4-digit PIN</p>
                    <PinDots filled={0} />
                  </div>
                  <PinPad />
                </div>
                <div className="text-center pt-5">
                  <span className="text-xs text-gray-400 dark:text-gray-600">← Use a different phone number</span>
                </div>
              </LoginCard>
            </PreviewCard>

            <PreviewCard label="2b · 2 dots filled">
              <LoginCard>
                <PhoneChip />
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enter your 4-digit PIN</p>
                    <PinDots filled={2} />
                  </div>
                  <PinPad />
                </div>
                <div className="text-center pt-5">
                  <span className="text-xs text-gray-400 dark:text-gray-600">← Use a different phone number</span>
                </div>
              </LoginCard>
            </PreviewCard>

            <PreviewCard label="2c · Incorrect PIN error">
              <LoginCard>
                <PhoneChip />
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enter your 4-digit PIN</p>
                    <PinDots filled={0} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-red-600 dark:text-red-400">Incorrect PIN. Please try again.</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">3 attempts remaining</p>
                  </div>
                  <PinPad />
                </div>
                <div className="text-center pt-5">
                  <span className="text-xs text-gray-400 dark:text-gray-600">← Use a different phone number</span>
                </div>
              </LoginCard>
            </PreviewCard>

            <PreviewCard label="2d · Locked — too many attempts">
              <LoginCard>
                <PhoneChip />
                <div className="text-center py-6 space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 dark:bg-red-950 flex items-center justify-center">
                    <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">Too many attempts.</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Try again in 30 minutes.</p>
                </div>
                <SmsDivider />
                <SmsButton />
                <div className="text-center pt-5">
                  <span className="text-xs text-gray-400 dark:text-gray-600">← Use a different phone number</span>
                </div>
              </LoginCard>
            </PreviewCard>

          </div>
        </section>

        {/* ── STATE 3: SMS Button ─────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Step 3 — SMS Button" sub="Shown below the PIN pad as an alternative login method" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

            <PreviewCard label="3a · SMS button — idle">
              <LoginCard>
                <PhoneChip />
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enter your 4-digit PIN</p>
                    <PinDots filled={0} />
                  </div>
                  <PinPad />
                </div>
                <SmsDivider />
                <SmsButton />
                <div className="text-center pt-5">
                  <span className="text-xs text-gray-400 dark:text-gray-600">← Use a different phone number</span>
                </div>
              </LoginCard>
            </PreviewCard>

            <PreviewCard label="3b · SMS button — sending / spinner">
              <LoginCard>
                <PhoneChip />
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enter your 4-digit PIN</p>
                    <PinDots filled={0} />
                  </div>
                  <PinPad />
                </div>
                <SmsDivider />
                <SmsButton sending />
                <div className="text-center pt-5">
                  <span className="text-xs text-gray-400 dark:text-gray-600">← Use a different phone number</span>
                </div>
              </LoginCard>
            </PreviewCard>

          </div>
        </section>

        {/* ── STATE 4: SMS Code Entry ─────────────────────────────────────── */}
        <section>
          <SectionHeader title="Step 4 — SMS Code Entry" sub="Shown after SMS is sent — user enters the 6-digit code" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

            <PreviewCard label="4a · Code entry — empty">
              <LoginCard>
                <PhoneChip />
                <SmsCodeEntry />
              </LoginCard>
            </PreviewCard>

            <PreviewCard label="4b · Code entry — filled (123456)">
              <LoginCard>
                <PhoneChip />
                <SmsCodeEntry code="123456" />
              </LoginCard>
            </PreviewCard>

            <PreviewCard label="4c · Verifying — pulse text">
              <LoginCard>
                <PhoneChip />
                <SmsCodeEntry code="123456" verifying />
              </LoginCard>
            </PreviewCard>

          </div>
        </section>

        <p className="text-xs text-gray-700 text-center pb-4">
          Login Flow Preview · Development only · Not accessible in production
        </p>

      </div>
    </div>
  );
}
