"use client";

import { useState, useTransition } from "react";

const PAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["",  "0", "⌫"],
];

interface SetPinPadProps {
  onSubmit: (pin: string) => Promise<{ error: string } | void>;
  theme?: "dark" | "light";
}

/**
 * Two-step PIN creation pad: Enter → Confirm.
 * If PINs match on confirm → calls onSubmit(pin).
 * If mismatch → error + resets to Enter step.
 * onSubmit returns { error } on failure, or void/undefined when server redirects.
 */
export function SetPinPad({ onSubmit, theme = "light" }: SetPinPadProps) {
  const [step, setStep]           = useState<"create" | "confirm">("create");
  const [firstPin, setFirstPin]   = useState("");
  const [input, setInput]         = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset(err?: string) {
    setStep("create");
    setFirstPin("");
    setInput("");
    if (err) setError(err); else setError(null);
  }

  function handleDigit(d: string) {
    if (input.length >= 4 || isPending) return;
    const next = input + d;
    setInput(next);
    setError(null);

    if (next.length < 4) return;

    if (step === "create") {
      setFirstPin(next);
      setInput("");
      setStep("confirm");
      return;
    }

    // Confirm step — check match
    if (next !== firstPin) {
      reset("PINs don't match. Try again.");
      return;
    }

    // Match — submit
    const confirmed = next;
    startTransition(async () => {
      const result = await onSubmit(confirmed);
      if (result?.error) reset(result.error);
      // on success, server action called redirect() — navigation is already happening
    });
  }

  function handleBackspace() {
    if (isPending) return;
    setInput((p) => p.slice(0, -1));
    setError(null);
  }

  const dark = theme === "dark";

  const dotFilled = dark
    ? "bg-white border-white scale-110"
    : "bg-indigo-600 border-indigo-600 scale-110";
  const dotEmpty  = dark ? "border-gray-600" : "border-gray-300 dark:border-gray-600";

  const btnCls = dark
    ? "bg-gray-800 hover:bg-gray-700 text-white"
    : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white";

  const headingCls = dark
    ? "text-gray-300"
    : "text-gray-700 dark:text-gray-300";

  const subCls = dark
    ? "text-gray-500"
    : "text-gray-500 dark:text-gray-400";

  const errCls = dark
    ? "text-red-400"
    : "text-red-600 dark:text-red-400";

  const pendingCls = dark ? "text-gray-500" : "text-gray-400 dark:text-gray-500";

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1.5">
        <p className={`text-sm font-semibold ${headingCls}`}>
          {step === "create" ? "Enter your new 4-digit PIN" : "Confirm your PIN"}
        </p>
        <p className={`text-xs ${subCls}`}>
          {step === "create"
            ? "You'll use this to log in from now on"
            : "Enter the same PIN again to confirm"}
        </p>
        <div className="flex justify-center gap-5 pt-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                input.length > i ? dotFilled : dotEmpty
              }`}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className={`text-sm text-center font-medium ${errCls}`}>{error}</p>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {PAD_ROWS.flat().map((key, idx) => {
          if (key === "") return <div key={idx} />;
          const isBack = key === "⌫";
          const disabled = isPending || (isBack ? input.length === 0 : input.length >= 4);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => (isBack ? handleBackspace() : handleDigit(key))}
              disabled={disabled}
              style={{ touchAction: "manipulation" }}
              className={`flex items-center justify-center h-14 rounded-2xl text-xl font-bold transition-all active:scale-95 disabled:opacity-40 select-none ${btnCls}`}
            >
              {key}
            </button>
          );
        })}
      </div>

      {isPending && (
        <p className={`text-center text-sm animate-pulse ${pendingCls}`}>
          Setting up your PIN…
        </p>
      )}
    </div>
  );
}
