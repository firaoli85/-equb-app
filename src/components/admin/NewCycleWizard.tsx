"use client";

import { useRef, useState, useTransition } from "react";
import { resetAndRebuildCycle } from "@/actions/new-cycle";
import type { ResetResult, RebuildInput } from "@/actions/new-cycle";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CurrentMember = {
  nameAmharic: string;
  nameEnglishFirst: string;
  nameEnglishLast: string;
  phone: string | null;
  weeklyAmount: number;   // cents
  wheelNumber: number;
  extraWheelNumber: number | null;
};

type MemberRow = {
  key: string;
  isNew: boolean;
  selected: boolean;
  nameAmharic: string;
  nameEnglishFirst: string;
  nameEnglishLast: string;
  phone: string;
  wheelNumber: string;
  extraWheelNumber: string;
  weeklyAmount: string;   // dollars, kept as string for editing
};

type RowErrors = {
  nameAmharic?: string;
  wheelNumber?: string;
  extraWheelNumber?: string;
  weeklyAmount?: string;
};

type ValidationResult = {
  rowErrors: Record<string, RowErrors>;
  crossErrors: string[];
  hasErrors: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function generatePreviewDates(startDateStr: string): string[] {
  if (!startDateStr) return [];
  const base = new Date(startDateStr + "T00:00:00.000Z");
  if (isNaN(base.getTime())) return [];
  return Array.from({ length: 20 }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i * 7);
    return d.toISOString().slice(0, 10);
  });
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

function validateRows(rows: MemberRow[]): ValidationResult {
  const activeRows = rows.filter((r) => r.isNew || r.selected);
  const rowErrors: Record<string, RowErrors> = {};
  const crossErrors: string[] = [];
  const allNums = new Map<number, string>();

  for (const row of activeRows) {
    const errs: RowErrors = {};
    const name = row.nameAmharic.trim() || row.key;

    if (!row.nameAmharic.trim() || row.nameAmharic.trim().length < 2) {
      errs.nameAmharic = "Required (min 2 chars)";
    }

    const amount = parseFloat(row.weeklyAmount);
    if (!row.weeklyAmount.trim() || isNaN(amount) || amount < 1) {
      errs.weeklyAmount = "Must be ≥ $1";
    }

    const wnStr = row.wheelNumber.trim();
    const wn = parseInt(wnStr, 10);
    const wnValid = wnStr !== "" && !isNaN(wn) && wn >= 1 && String(wn) === wnStr;
    if (!wnValid) {
      errs.wheelNumber = "Positive whole #";
    } else {
      const owner = allNums.get(wn);
      if (owner) crossErrors.push(`Lucky #${wn} is already used by ${owner}`);
      else allNums.set(wn, name);
    }

    const enStr = row.extraWheelNumber.trim();
    if (enStr !== "") {
      const en = parseInt(enStr, 10);
      const enValid = !isNaN(en) && en >= 1 && String(en) === enStr;
      if (!enValid) {
        errs.extraWheelNumber = "Positive whole #";
      } else if (wnValid && en === wn) {
        errs.extraWheelNumber = "Must differ from lucky #";
      } else {
        const owner = allNums.get(en);
        if (owner) crossErrors.push(`Extra lucky #${en} conflicts with ${owner}`);
        else allNums.set(en, `${name} (extra)`);
      }
    }

    if (Object.keys(errs).length > 0) rowErrors[row.key] = errs;
  }

  return {
    rowErrors,
    crossErrors,
    hasErrors: Object.keys(rowErrors).length > 0 || crossErrors.length > 0,
  };
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  const steps = [
    { n: 1 as const, label: "Backup" },
    { n: 2 as const, label: "Members" },
    { n: 3 as const, label: "Start Date" },
    { n: 4 as const, label: "Execute" },
  ];
  return (
    <div className="flex items-center gap-1 mb-8 select-none">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-1 flex-1 last:flex-none">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 shrink-0 transition-colors ${
            s.n < current
              ? "bg-emerald-500 border-emerald-500 text-white"
              : s.n === current
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#141414]"
              : "border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600 bg-white dark:bg-[#141414]"
          }`}>
            {s.n < current ? "✓" : s.n}
          </span>
          <span className={`text-xs font-medium hidden sm:block shrink-0 ${
            s.n === current ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"
          }`}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 mx-1 ${
              s.n < current ? "bg-emerald-400" : "bg-gray-200 dark:bg-gray-700"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Shared style tokens ───────────────────────────────────────────────────────

const card = "bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm";
const btn = {
  primary:   "px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
  secondary: "px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
  danger:    "px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
};

function cellInput(hasErr?: boolean) {
  return `w-full px-1.5 py-1 text-xs rounded border ${
    hasErr
      ? "border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/20"
      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a]"
  } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors`;
}

// ── Wizard ────────────────────────────────────────────────────────────────────

export function NewCycleWizard({ currentMembers }: { currentMembers: CurrentMember[] }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 state
  const [downloading,       setDownloading]       = useState(false);
  const [downloadError,     setDownloadError]      = useState<string | null>(null);
  const [backupDownloaded,  setBackupDownloaded]   = useState(false);

  // Step 2 state
  const newKeyRef = useRef(0);
  const [rows, setRows] = useState<MemberRow[]>(() =>
    currentMembers.map((m) => ({
      key:              `ex-${m.wheelNumber}`,
      isNew:            false,
      selected:         true,
      nameAmharic:      m.nameAmharic,
      nameEnglishFirst: m.nameEnglishFirst,
      nameEnglishLast:  m.nameEnglishLast,
      phone:            m.phone ?? "",
      wheelNumber:      String(m.wheelNumber),
      extraWheelNumber: m.extraWheelNumber != null ? String(m.extraWheelNumber) : "",
      weeklyAmount:     (m.weeklyAmount / 100).toFixed(2),
    }))
  );

  // Step 3 state
  const [startDate, setStartDate] = useState("");

  // Step 4 state
  const [confirmText,  setConfirmText]  = useState("");
  const [resetResult,  setResetResult]  = useState<ResetResult | null>(null);
  const [copied,       setCopied]       = useState(false);
  const [isPending,    startTransition] = useTransition();

  // ── Derived ──────────────────────────────────────────────────────────────────

  const validation     = validateRows(rows);
  const activeRows     = rows.filter((r) => r.isNew || r.selected);
  const newRows        = rows.filter((r) => r.isNew);
  const removedCount   = rows.filter((r) => !r.isNew && r.selected === false).length;
  const previewDates   = generatePreviewDates(startDate);
  const startDateValid = previewDates.length === 20;
  const allExisting    = rows.every((r) => r.isNew || r.selected);
  const someExisting   = rows.some((r) => !r.isNew && r.selected);

  // ── Row handlers ─────────────────────────────────────────────────────────────

  function updateRow(key: string, field: keyof MemberRow, value: string) {
    setRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: value } : r));
  }

  function toggleRow(key: string) {
    setRows((prev) => prev.map((r) => r.key === key && !r.isNew ? { ...r, selected: !r.selected } : r));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function addMember() {
    const key = `new-${++newKeyRef.current}`;
    setRows((prev) => [...prev, {
      key, isNew: true, selected: true,
      nameAmharic: "", nameEnglishFirst: "", nameEnglishLast: "",
      phone: "", wheelNumber: "", extraWheelNumber: "", weeklyAmount: "",
    }]);
  }

  // ── Builds the RebuildInput payload from wizard state ────────────────────────

  function buildInput(): RebuildInput {
    return {
      newStartDate: startDate,
      members: activeRows.map((r) => ({
        nameAmharic:      r.nameAmharic.trim(),
        nameEnglishFirst: r.nameEnglishFirst.trim(),
        nameEnglishLast:  r.nameEnglishLast.trim(),
        phone:            r.phone.trim() || null,
        weeklyAmount:     parseFloat(r.weeklyAmount),
        wheelNumber:      parseInt(r.wheelNumber, 10),
        extraWheelNumber: r.extraWheelNumber.trim() ? parseInt(r.extraWheelNumber, 10) : null,
      })),
    };
  }

  // ── Download backup ───────────────────────────────────────────────────────────

  async function downloadBackup() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/admin/export-cycle");
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `equb-cycle-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupDownloaded(true);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  // ── Execute reset ─────────────────────────────────────────────────────────────

  function executeReset() {
    const input = buildInput();
    startTransition(async () => {
      try {
        const result = await resetAndRebuildCycle(input);
        setResetResult(result);
      } catch (err) {
        setResetResult({ error: err instanceof Error ? err.message : "An unexpected error occurred." });
      }
    });
  }

  // ── Copy all links ────────────────────────────────────────────────────────────

  async function copyAllLinks(members: { nameAmharic: string; token: string }[]) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = members.map((m) => `${m.nameAmharic}: ${origin}/m/${m.token}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked (e.g. non-HTTPS) — silent fail; links are visible on screen
    }
  }

  // ── Step 1: Forced backup ─────────────────────────────────────────────────────

  if (step === 1) return (
    <div>
      <StepIndicator current={1} />
      <div className={card}>
        <div className="flex items-start gap-4 mb-6">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Step 1 of 4 — Download backup before continuing
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Starting a new cycle <strong className="text-gray-900 dark:text-white">permanently deletes</strong> all current data — winners, payments, draws, and audit logs. This cannot be undone. Save a backup first.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Backup includes</p>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {["All members — names, phones, lucky numbers, amounts (re-entry sheet)",
              "All winner draws and payout records",
              "Full payment history and week dates"].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {downloadError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{downloadError}</p>
        )}

        {backupDownloaded ? (
          <div className="flex items-center gap-2 mb-6 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Backup downloaded
            <button
              onClick={downloadBackup}
              disabled={downloading}
              className="ml-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline transition-colors"
            >
              Download again
            </button>
          </div>
        ) : (
          <button
            onClick={downloadBackup}
            disabled={downloading}
            className={btn.primary + " mb-6 flex items-center gap-2"}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? "Preparing download…" : "Download backup (.xlsx)"}
          </button>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={() => setStep(2)} disabled={!backupDownloaded} className={btn.primary}>
            Continue to member list →
          </button>
        </div>
      </div>
    </div>
  );

  // ── Step 2: Member entry ──────────────────────────────────────────────────────

  if (step === 2) {
    const headerCheckRef = (el: HTMLInputElement | null) => {
      if (el) el.indeterminate = someExisting && !allExisting;
    };

    return (
      <div>
        <StepIndicator current={2} />
        <div className={card}>
          <div className="flex items-start justify-between mb-4 gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Step 2 of 4 — Members for new cycle</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Uncheck members who are leaving. Update numbers and amounts for the new cycle.
              </p>
            </div>
            <div className="text-right shrink-0 text-sm">
              <p className="font-semibold text-gray-900 dark:text-white">{activeRows.length} selected</p>
              {newRows.length > 0 && <p className="text-xs text-emerald-600 dark:text-emerald-400">{newRows.length} new</p>}
              {removedCount > 0 && <p className="text-xs text-amber-600 dark:text-amber-400">{removedCount} removed</p>}
            </div>
          </div>

          {validation.crossErrors.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5">Fix conflicts before continuing:</p>
              <ul className="space-y-1">
                {validation.crossErrors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400">• {e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto -mx-6">
            <div className="px-6 min-w-[780px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="w-8 py-2 px-1 text-center">
                      <input
                        type="checkbox"
                        ref={headerCheckRef}
                        checked={allExisting}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setRows((prev) => prev.map((r) => r.isNew ? r : { ...r, selected: val }));
                        }}
                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                        title="Select / deselect all"
                      />
                    </th>
                    {["Amharic Name *", "Eng First", "Eng Last", "Phone", "Lucky # *", "Extra #", "$/week *"].map((h) => (
                      <th key={h} className="py-2 px-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const errs    = validation.rowErrors[row.key] ?? {};
                    const inactive = !row.isNew && !row.selected;
                    return (
                      <tr key={row.key} className={`border-b border-gray-100 dark:border-gray-800 transition-opacity ${inactive ? "opacity-40" : ""}`}>
                        <td className="py-1 px-1 text-center">
                          {row.isNew ? (
                            <button
                              onClick={() => removeRow(row.key)}
                              title="Remove"
                              className="w-5 h-5 inline-flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded font-bold text-base leading-none transition-colors"
                            >×</button>
                          ) : (
                            <input type="checkbox" checked={row.selected} onChange={() => toggleRow(row.key)} className="w-4 h-4 accent-emerald-500 cursor-pointer" />
                          )}
                        </td>
                        <td className="py-1 px-2 min-w-[140px]">
                          <input type="text" value={row.nameAmharic} onChange={(e) => updateRow(row.key, "nameAmharic", e.target.value)} disabled={inactive} className={cellInput(!!errs.nameAmharic)} placeholder="አማርኛ ስም" />
                          {errs.nameAmharic && <p className="text-red-500 text-[10px] mt-0.5 leading-tight">{errs.nameAmharic}</p>}
                        </td>
                        <td className="py-1 px-2 min-w-[80px]">
                          <input type="text" value={row.nameEnglishFirst} onChange={(e) => updateRow(row.key, "nameEnglishFirst", e.target.value)} disabled={inactive} className={cellInput()} placeholder="First" />
                        </td>
                        <td className="py-1 px-2 min-w-[80px]">
                          <input type="text" value={row.nameEnglishLast} onChange={(e) => updateRow(row.key, "nameEnglishLast", e.target.value)} disabled={inactive} className={cellInput()} placeholder="Last" />
                        </td>
                        <td className="py-1 px-2 min-w-[100px]">
                          <input type="tel" value={row.phone} onChange={(e) => updateRow(row.key, "phone", e.target.value)} disabled={inactive} className={cellInput()} placeholder="+1..." />
                        </td>
                        <td className="py-1 px-2 min-w-[60px]">
                          <input type="text" inputMode="numeric" value={row.wheelNumber} onChange={(e) => updateRow(row.key, "wheelNumber", e.target.value)} disabled={inactive} className={cellInput(!!errs.wheelNumber)} placeholder="#" />
                          {errs.wheelNumber && <p className="text-red-500 text-[10px] mt-0.5 leading-tight">{errs.wheelNumber}</p>}
                        </td>
                        <td className="py-1 px-2 min-w-[60px]">
                          <input type="text" inputMode="numeric" value={row.extraWheelNumber} onChange={(e) => updateRow(row.key, "extraWheelNumber", e.target.value)} disabled={inactive} className={cellInput(!!errs.extraWheelNumber)} placeholder="—" />
                          {errs.extraWheelNumber && <p className="text-red-500 text-[10px] mt-0.5 leading-tight">{errs.extraWheelNumber}</p>}
                        </td>
                        <td className="py-1 px-2 min-w-[72px]">
                          <input type="text" inputMode="decimal" value={row.weeklyAmount} onChange={(e) => updateRow(row.key, "weeklyAmount", e.target.value)} disabled={inactive} className={cellInput(!!errs.weeklyAmount)} placeholder="0.00" />
                          {errs.weeklyAmount && <p className="text-red-500 text-[10px] mt-0.5 leading-tight">{errs.weeklyAmount}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={addMember} className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add member
          </button>

          {activeRows.length === 0 && (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400 font-medium">At least one member is required to continue.</p>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button onClick={() => setStep(1)} className={btn.secondary}>← Back</button>
            <button onClick={() => setStep(3)} disabled={validation.hasErrors || activeRows.length === 0} className={btn.primary}>
              Continue to start date →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Start date + 20-week preview ─────────────────────────────────────

  if (step === 3) return (
    <div>
      <StepIndicator current={3} />
      <div className={card}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Step 3 of 4 — New cycle start date</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Week 1 begins on this date. Weeks 2–20 follow every 7 days.
        </p>

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Week 1 date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1.5 block w-52 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
          />
        </label>

        {startDateValid && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              20-week preview — confirm these dates before continuing
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {previewDates.map((d, i) => (
                <div key={d} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 w-5 shrink-0 text-right">{i + 1}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{fmtDate(d)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={() => setStep(2)} className={btn.secondary}>← Back</button>
          <button onClick={() => setStep(4)} disabled={!startDateValid} className={btn.primary}>
            Confirm dates → Continue to final step
          </button>
        </div>
      </div>
    </div>
  );

  // ── Step 4: Confirm + execute ─────────────────────────────────────────────────

  // Loading state — shown while transaction is in flight
  if (isPending) return (
    <div>
      <StepIndicator current={4} />
      <div className={card}>
        <div className="py-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 mb-5 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-base font-semibold text-gray-900 dark:text-white">Resetting cycle…</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Do not close this page.</p>
        </div>
      </div>
    </div>
  );

  // Error state
  if (resetResult && "error" in resetResult) return (
    <div>
      <StepIndicator current={4} />
      <div className={card}>
        <div className="flex items-start gap-4 mb-5">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Reset failed</h2>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{resetResult.error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              The current cycle was not modified — nothing was deleted. You can retry safely.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={() => setStep(3)} className={btn.secondary}>← Back to review</button>
          <button onClick={() => { setResetResult(null); setConfirmText(""); }} className={btn.danger}>
            Retry
          </button>
        </div>
      </div>
    </div>
  );

  // Success state
  if (resetResult && "ok" in resetResult) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const members = resetResult.members;
    return (
      <div>
        <StepIndicator current={4} />
        <div className={card}>
          <div className="flex items-center gap-3 mb-6">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">New cycle started</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {members.length} member{members.length !== 1 ? "s" : ""} re-enrolled · Week 1: {fmtDate(startDate)}
              </p>
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-xl p-4 mb-6 text-sm text-indigo-800 dark:text-indigo-200">
            Send each member their personal link below. They will confirm the agreement and set a new PIN on first login.
            Afterward, visit <strong>Wheel Setup</strong> to merge the single-number slots into paired groups for the new cycle.
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Member login links</p>
            <button
              onClick={() => copyAllLinks(members)}
              className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy all links
                </>
              )}
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
            {members.map((m) => (
              <div key={m.token} className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-[#1a1a1a]">
                <span className="text-sm font-medium text-gray-900 dark:text-white w-40 shrink-0 truncate">
                  {m.nameAmharic}
                </span>
                <a
                  href={`${origin}/m/${m.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline truncate flex-1 min-w-0"
                >
                  {origin}/m/{m.token}
                </a>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <a href="/admin" className={btn.primary + " inline-block"}>
              Go to Dashboard →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Default: Step 4 form (type-to-confirm)
  const returningCount = activeRows.length - newRows.length;

  return (
    <div>
      <StepIndicator current={4} />
      <div className={card}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Step 4 of 4 — Confirm &amp; Execute</h2>

        {/* Summary */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6 space-y-1">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-white">{activeRows.length} members</span> selected for the new cycle
            {returningCount > 0 && newRows.length > 0 && (
              <span className="text-gray-500 dark:text-gray-400"> ({returningCount} returning · {newRows.length} new)</span>
            )}
          </p>
          {removedCount > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {removedCount} member{removedCount !== 1 ? "s" : ""} from the current cycle will not carry over
            </p>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            New cycle starts <span className="font-semibold text-gray-900 dark:text-white">{fmtDate(startDate)}</span>
          </p>
        </div>

        {/* Danger warning */}
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">This action is permanent and irreversible</p>
          <p className="text-sm text-red-700 dark:text-red-400">
            ALL current data — winners, payments, draws, history, and audit log — will be <strong>permanently deleted</strong> and replaced with the new cycle. If the reset fails for any reason, the current cycle is preserved intact.
          </p>
        </div>

        {/* Type-to-confirm */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type{" "}
            <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-sm text-gray-900 dark:text-white">
              WIPE
            </code>{" "}
            to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            className={`w-40 border-2 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none transition-colors ${
              confirmText === "WIPE"
                ? "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 focus:ring-0"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white focus:border-gray-400 dark:focus:border-gray-500"
            }`}
            placeholder="WIPE"
          />
        </div>

        {/* Execute + back */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={() => setStep(3)} className={btn.secondary}>← Back</button>
          <button
            onClick={executeReset}
            disabled={confirmText !== "WIPE" || isPending}
            className={btn.danger + " flex items-center gap-2"}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Permanently reset and start new cycle
          </button>
        </div>
      </div>
    </div>
  );
}
