interface Props {
  displayName: string;
  wheelNumber: number;
  extraWheelNumber: number | null;
  weeklyAmountFormatted: string;
  paidCount: number;
  totalWeeks: number;
}

export function MemberIdentityHeader({
  displayName,
  wheelNumber,
  extraWheelNumber,
  weeklyAmountFormatted,
  paidCount,
  totalWeeks,
}: Props) {
  // Spread operator handles multi-byte Amharic characters correctly
  const initial = [...displayName][0] ?? "?";
  const luckyLabel =
    extraWheelNumber != null
      ? `#${wheelNumber} · #${extraWheelNumber}`
      : `#${wheelNumber}`;

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 px-5 pt-5 pb-4 shadow-sm animate-fade-in-up">

      {/* Avatar + privacy badge */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0 select-none"
          aria-hidden="true"
        >
          <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">
            {initial}
          </span>
        </div>

        <div className="flex items-center gap-1 pt-0.5">
          <svg
            className="w-3 h-3 text-gray-400 dark:text-gray-600 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-600">
            Only visible to you
          </span>
        </div>
      </div>

      {/* Name — the primary identity signal */}
      <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-1 text-balance">
        {displayName}
      </h1>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        Your personal Equb account
      </p>

      {/* Personal info strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 leading-none">
            Lucky no.
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums leading-none">
            {luckyLabel}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 leading-none">
            Weekly
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums leading-none">
            {weeklyAmountFormatted}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 leading-none">
            Standing
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums leading-none">
            {paidCount}
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
              {" "}of {totalWeeks}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
