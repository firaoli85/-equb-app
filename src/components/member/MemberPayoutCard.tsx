interface Props {
  wheelNumber: number;
  extraWheelNumber: number | null;
  heroAmountFormatted: string;
  heroLabel: string;
  mainPayoutDrawn: boolean;
  collectionConfirmed: boolean;
  amountPaidFormatted: string;
  totalAmountFormatted: string;
  nextDueDateFormatted: string | null;
  hasExtra: boolean;
  extraNetFormatted: string | null;
  combinedNetFormatted: string | null;
}

export function MemberPayoutCard({
  wheelNumber,
  extraWheelNumber,
  heroAmountFormatted,
  heroLabel,
  mainPayoutDrawn,
  collectionConfirmed,
  amountPaidFormatted,
  totalAmountFormatted,
  nextDueDateFormatted,
  hasExtra,
  extraNetFormatted,
  combinedNetFormatted,
}: Props) {
  const drawStatusLabel = collectionConfirmed
    ? "Received"
    : mainPayoutDrawn
    ? "Pending Signature"
    : "In the draw";

  const drawStatusClass = collectionConfirmed
    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900"
    : mainPayoutDrawn
    ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900"
    : "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700";

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm px-5 pt-5 pb-4 animate-fade-in-up-1">

      {/* ── Label ────────────────────────────────────────────── */}
      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
        {heroLabel}
      </p>

      {/* ── Hero: net payout amount ───────────────────────────── */}
      <p
        className="font-fraunces tabular-nums leading-none mb-3"
        style={{
          fontSize: "clamp(2.5rem, 10.5vw, 3.5rem)",
          fontWeight: 900,
          color: "var(--hero-amount-accent)",
        }}
      >
        {heroAmountFormatted}
      </p>

      {/* ── Lucky number + draw state ─────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{
            background: "var(--gold-badge-bg)",
            border: "1px solid var(--gold-badge-border)",
            color: "var(--gold-badge-text)",
          }}
        >
          Lucky #{wheelNumber}
        </span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${drawStatusClass}`}>
          {collectionConfirmed && (
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
            </svg>
          )}
          {drawStatusLabel}
        </span>
      </div>

      {/* ── Divider ──────────────────────────────────────────── */}
      <div className="border-t border-gray-100 dark:border-gray-800 mb-3" />

      {/* ── Supporting info row ───────────────────────────────── */}
      <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        <span className="font-semibold text-gray-700 dark:text-gray-200">{amountPaidFormatted}</span>
        {" of "}{totalAmountFormatted} paid
        {nextDueDateFormatted && (
          <>
            <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
            Next{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">{nextDueDateFormatted}</span>
          </>
        )}
      </p>

      {/* ── Extra wheel section ───────────────────────────────── */}
      {hasExtra && extraNetFormatted && combinedNetFormatted && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                Extra Wheel Net
              </p>
              <p
                className="font-fraunces text-2xl tabular-nums"
                style={{ fontWeight: 700, color: "var(--hero-amount-accent)" }}
              >
                {extraNetFormatted}
              </p>
              {extraWheelNumber != null && (
                <span
                  className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5"
                  style={{
                    background: "var(--gold-badge-bg)",
                    border: "1px solid var(--gold-badge-border)",
                    color: "var(--gold-badge-text)",
                  }}
                >
                  Lucky #{extraWheelNumber}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                Combined Total
              </p>
              <p
                className="font-fraunces text-3xl tabular-nums"
                style={{ fontWeight: 900, color: "var(--hero-amount-accent)" }}
              >
                {combinedNetFormatted}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
