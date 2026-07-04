export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { TOTAL_WEEKS } from "@/lib/equb";
import { notFound, redirect } from "next/navigation";

type DrawnWeek = {
  weekNumber: number;
  date: Date;
  winnerNumbers: number[];
  payoutStatus: "PENDING" | "COLLECTED" | null;
};

function formatDayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function PaidOutPill() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shrink-0">
      <svg
        className="w-2.5 h-2.5 shrink-0"
        fill="none"
        viewBox="0 0 12 12"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
      </svg>
      Paid out
    </span>
  );
}

function PendingPill() {
  return (
    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 shrink-0">
      Pending
    </span>
  );
}

export default async function MemberCollectionsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const viewer = await db.member.findUnique({
    where: { token },
    select: {
      id: true,
      confirmedAt: true,
      wheelNumber: true,
      extraWheelNumber: true,
    },
  });
  if (!viewer) notFound();
  if (!viewer.confirmedAt) redirect(`/m/${token}`);

  const allWeeks = await db.week.findMany({
    orderBy: { weekNumber: "asc" },
    select: {
      weekNumber: true,
      date: true,
      isSkipped: true,
      winnerNumbers: true,
      payoutStatus: true,
      // payoutMethod intentionally omitted — privacy
    },
  });

  const drawnWeeks: DrawnWeek[] = allWeeks
    .filter((w) => w.winnerNumbers.length > 0)
    .map((w) => ({
      weekNumber: w.weekNumber,
      date: w.date,
      winnerNumbers: w.winnerNumbers,
      payoutStatus: w.payoutStatus as "PENDING" | "COLLECTED" | null,
    }))
    .sort((a, b) => b.weekNumber - a.weekNumber);

  const drawnCount = drawnWeeks.length;

  const nextDrawWeek =
    allWeeks.find((w) => !w.isSkipped && w.winnerNumbers.length === 0) ?? null;

  const viewerMainDrawWeek =
    drawnWeeks.find((w) => w.winnerNumbers.includes(viewer.wheelNumber)) ??
    null;
  const viewerExtraDrawWeek =
    viewer.extraWheelNumber != null
      ? (drawnWeeks.find((w) =>
          w.winnerNumbers.includes(viewer.extraWheelNumber!)
        ) ?? null)
      : null;

  const mainCollected = viewerMainDrawWeek?.payoutStatus === "COLLECTED";
  const extraCollected = viewerExtraDrawWeek?.payoutStatus === "COLLECTED";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* ── Summary header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 animate-fade-in-up">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
            Collections
          </h1>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            Draw history · numbers only
          </p>
        </div>
        <div className="text-right pt-0.5 shrink-0">
          <span className="text-2xl font-black tabular-nums leading-none text-indigo-600 dark:text-indigo-400">
            {drawnCount}/{TOTAL_WEEKS}
          </span>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            weeks drawn
          </p>
        </div>
      </div>

      {/* ── Your Draw Card ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 px-4 pt-3.5 pb-3.5 mb-3 animate-fade-in-up-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 dark:text-indigo-500 mb-2.5">
          Your draw
        </p>

        {/* Main wheel */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                viewerMainDrawWeek
                  ? "bg-emerald-100 dark:bg-emerald-950/50"
                  : "bg-indigo-100 dark:bg-indigo-900/40"
              }`}
            >
              {viewerMainDrawWeek ? (
                <svg
                  className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  viewBox="0 0 16 16"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l3.5 3.5L13 4.5"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-indigo-500 dark:text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                Lucky #{viewer.wheelNumber}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                {viewerMainDrawWeek
                  ? `You collected in Week ${viewerMainDrawWeek.weekNumber}`
                  : "Still in the draw — not yet drawn"}
              </p>
            </div>
          </div>
          {viewerMainDrawWeek &&
            (mainCollected ? <PaidOutPill /> : <PendingPill />)}
        </div>

        {/* Extra wheel */}
        {viewer.extraWheelNumber != null && (
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  viewerExtraDrawWeek
                    ? "bg-emerald-100 dark:bg-emerald-950/50"
                    : "bg-indigo-100 dark:bg-indigo-900/40"
                }`}
              >
                {viewerExtraDrawWeek ? (
                  <svg
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    viewBox="0 0 16 16"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l3.5 3.5L13 4.5"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-indigo-500 dark:text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                    />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                  Lucky #{viewer.extraWheelNumber}
                  <span className="ml-1.5 text-[10px] font-medium text-indigo-400 dark:text-indigo-500">
                    extra
                  </span>
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {viewerExtraDrawWeek
                    ? `You collected in Week ${viewerExtraDrawWeek.weekNumber}`
                    : "Still in the draw — not yet drawn"}
                </p>
              </div>
            </div>
            {viewerExtraDrawWeek &&
              (extraCollected ? <PaidOutPill /> : <PendingPill />)}
          </div>
        )}
      </div>

      {/* ── Next Draw Card ───────────────────────────────────────── */}
      {nextDrawWeek && (
        <div className="rounded-2xl bg-white dark:bg-[#141414] border border-gray-100 dark:border-gray-800 shadow-sm px-4 pt-3.5 pb-3.5 mb-3 animate-fade-in-up-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 leading-none mb-1">
                Next draw
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                Week {nextDrawWeek.weekNumber}
                <span className="mx-1.5 text-gray-300 dark:text-gray-600">
                  ·
                </span>
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  {formatDayDate(nextDrawWeek.date)}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Draw History ─────────────────────────────────────────── */}
      {drawnWeeks.length > 0 ? (
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#141414] border border-gray-100 dark:border-gray-800 shadow-sm mb-3 animate-fade-in-up-3">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {drawnWeeks.map((week, i) => {
              const isShared = week.winnerNumbers.length > 1;
              const numbersStr = week.winnerNumbers
                .map((n) => `#${n}`)
                .join(" & ");
              // Stagger first 8 rows; rows beyond that appear with the card
              const stagger = i < 8;
              return (
                <div
                  key={week.weekNumber}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5${stagger ? " animate-fade-in-up" : ""}`}
                  style={stagger ? { animationDelay: `${0.30 + i * 0.06}s` } : undefined}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* WK stamp */}
                    <div className="text-center shrink-0 pt-0.5 w-7">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 dark:text-indigo-500 leading-none">
                        WK
                      </p>
                      <p className="text-base font-black tabular-nums text-gray-900 dark:text-white leading-tight">
                        {week.weekNumber}
                      </p>
                    </div>
                    {/* Numbers + date */}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                        {numbersStr}
                        {isShared && (
                          <span className="ml-1.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                            shared draw
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatDayDate(week.date)}
                      </p>
                    </div>
                  </div>
                  {week.payoutStatus === "COLLECTED" ? (
                    <PaidOutPill />
                  ) : (
                    <PendingPill />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#141414] border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-8 mb-3 animate-fade-in-up-3 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No draws have happened yet.
          </p>
        </div>
      )}

      {/* ── Privacy line ─────────────────────────────────────────── */}
      <p className="text-center text-[11px] text-gray-400 dark:text-gray-600 leading-relaxed px-2 animate-fade-in-up-4">
        Draws are shown by lucky number only. Who holds each number stays
        private.
      </p>
    </div>
  );
}
