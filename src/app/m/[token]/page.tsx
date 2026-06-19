export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  calculateMemberFee,
  calculateMemberGross,
  calculateNetPayout,
  formatCurrency,
  formatDate,
  getDisplayName,
  getCurrentWeekNumber,
  mainWheelWeekly,
  extraWheelWeekly,
  TOTAL_WEEKS,
  EQUB_START,
} from "@/lib/equb";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ConfirmAgreement } from "@/components/member/ConfirmAgreement";
import { ConfirmCollectionReceipt } from "@/components/member/ConfirmCollectionReceipt";
import { AutoRefresh } from "@/components/member/AutoRefresh";
import { WeekStampList, type StampWeek } from "@/components/member/WeekStampList";
import { EqubCalendar, type CalendarWeek } from "@/components/member/EqubCalendar";

export default async function MemberView({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const member = await db.member.findUnique({
    where: { token },
    include: {
      payments: {
        include: { week: true },
        orderBy: { week: { weekNumber: "asc" } },
      },
    },
  });

  if (!member) notFound();

  const memberNameEnglish = member.nameEnglishFirst || member.nameAmharic;

  if (!member.confirmedAt) {
    return (
      <ConfirmAgreement
        token={member.token}
        memberNameEnglish={memberNameEnglish}
        memberNameAmharic={member.nameAmharic}
        weeklyAmountFormatted={formatCurrency(member.weeklyAmount)}
      />
    );
  }

  const hasExtra = member.extraWheelNumber !== null;

  // ── Per-wheel amounts ─────────────────────────────────────────────────
  const mainWeekly  = mainWheelWeekly(member.weeklyAmount, hasExtra);
  const extraWeekly = hasExtra ? extraWheelWeekly(member.weeklyAmount) : 0;

  const mainGross = calculateMemberGross(mainWeekly);
  const mainFee   = calculateMemberFee(mainWeekly);
  const mainNet   = calculateNetPayout(mainGross, mainFee);

  const extraGross = hasExtra ? calculateMemberGross(extraWeekly) : 0;
  const extraFee   = hasExtra ? calculateMemberFee(extraWeekly) : 0;
  const extraNet   = hasExtra ? calculateNetPayout(extraGross, extraFee) : 0;

  // ── WeekPayout rows ───────────────────────────────────────────────────
  const memberPayouts = await db.weekPayout.findMany({
    where: { memberId: member.id },
    include: { week: { select: { weekNumber: true, date: true } } },
  });

  const week1Date      = member.payments.find((p) => p.week.weekNumber === 1)?.week.date ?? EQUB_START;
  const currentWeekNum = getCurrentWeekNumber(week1Date);

  const mainPayout  = memberPayouts.find((p) => p.wheelType === "MAIN")  ?? null;
  const extraPayout = hasExtra ? (memberPayouts.find((p) => p.wheelType === "EXTRA") ?? null) : null;

  // ── Payment standing ──────────────────────────────────────────────────
  const paidCount     = member.payments.filter((p) => p.status === "PAID").length;
  const lateCount     = member.payments.filter((p) => p.status === "LATE").length;
  const deferredCount = member.payments.filter((p) => p.status === "DEFERRED").length;
  const partialCount  = member.payments.filter((p) => p.status === "PARTIAL").length;
  const behindCount   = lateCount + deferredCount + partialCount;

  const owedCents =
    (lateCount + deferredCount) * member.weeklyAmount +
    member.payments
      .filter((p) => p.status === "PARTIAL" && p.paidAmount != null)
      .reduce((sum, p) => sum + (member.weeklyAmount - p.paidAmount!), 0);
  const owedDollars = Math.round(owedCents / 100);

  const remainingWeeks = TOTAL_WEEKS - paidCount;

  // ── Scroll-stamp list (dates pre-formatted for serialisation) ─────────
  const stampWeeks: StampWeek[] = member.payments.map((p) => ({
    id:                p.id,
    weekNumber:        p.week.weekNumber,
    date:              formatDate(p.week.date),
    status:            p.status as StampWeek["status"],
    isMainPayoutWeek:  mainPayout?.week.weekNumber === p.week.weekNumber,
    isExtraPayoutWeek: extraPayout?.week.weekNumber === p.week.weekNumber,
  }));

  // ── Hero card state ───────────────────────────────────────────────────
  const heroAmount =
    mainPayout?.amount
      ? formatCurrency(Math.round(Number(mainPayout.amount) * 100))
      : formatCurrency(mainNet);

  const heroLabel =
    mainPayout && member.collectionConfirmedAt
      ? `Received Wk ${mainPayout.week.weekNumber} · ${formatDate(mainPayout.week.date)}`
      : mainPayout
      ? "Payout Ready to Sign"
      : hasExtra
      ? "Main Wheel Net Payout"
      : "Your Net Payout";

  // ── Calendar data ─────────────────────────────────────────────────────
  const calendarWeeks: CalendarWeek[] = member.payments.map((p) => ({
    weekNumber: p.week.weekNumber,
    date:       p.week.date.toISOString().slice(0, 10),
    status:     p.status as CalendarWeek["status"],
  }));

  const equbMonths = [
    ...new Set(member.payments.map((p) => p.week.date.toISOString().slice(0, 7))),
  ].sort();
  const nowMonth = new Date().toISOString().slice(0, 7);
  const defaultCalMonth: string =
    equbMonths.length === 0
      ? nowMonth
      : equbMonths.includes(nowMonth)
      ? nowMonth
      : equbMonths.reduce((prev, curr) =>
          Math.abs(new Date(curr + "-01").getTime() - Date.now()) <
          Math.abs(new Date(prev + "-01").getTime() - Date.now())
            ? curr
            : prev
        );

  // ── Documents count (agreement + signed receipts) ─────────────────────
  const docsCount =
    1 +
    (mainPayout != null && member.collectionConfirmedAt != null ? 1 : 0) +
    (hasExtra && extraPayout != null && member.collectionConfirmedAtExtra != null ? 1 : 0);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10 space-y-4">

      {/* ── Collection receipt confirmations ──────────────────────────────── */}
      {mainPayout && !member.collectionConfirmedAt && (
        <ConfirmCollectionReceipt
          token={member.token}
          memberNameEnglish={memberNameEnglish || member.nameAmharic}
          memberNameAmharic={member.nameAmharic}
          weeklyAmountFormatted={formatCurrency(mainWeekly)}
          netFormatted={
            mainPayout.amount
              ? formatCurrency(Math.round(Number(mainPayout.amount) * 100))
              : formatCurrency(mainNet)
          }
          feeFormatted={formatCurrency(mainFee)}
          payoutDate={formatDate(mainPayout.week.date)}
          winnerWheelNumber={member.wheelNumber}
          remainingWeeks={remainingWeeks}
          wheelType="main"
        />
      )}
      {hasExtra && extraPayout && !member.collectionConfirmedAtExtra && (
        <ConfirmCollectionReceipt
          token={member.token}
          memberNameEnglish={memberNameEnglish || member.nameAmharic}
          memberNameAmharic={member.nameAmharic}
          weeklyAmountFormatted={formatCurrency(extraWeekly)}
          netFormatted={
            extraPayout.amount
              ? formatCurrency(Math.round(Number(extraPayout.amount) * 100))
              : formatCurrency(extraNet)
          }
          feeFormatted={formatCurrency(extraFee)}
          payoutDate={formatDate(extraPayout.week.date)}
          winnerWheelNumber={member.extraWheelNumber!}
          remainingWeeks={remainingWeeks}
          wheelType="extra"
        />
      )}

      {/* ── Hero card ────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 animate-fade-in-up"
        style={{ background: "var(--hero-bg)", boxShadow: "var(--hero-shadow)" }}
      >
        {/* Member name — always visible, respects language preference */}
        <h2 className="text-lg font-bold text-blue-900 dark:text-white mb-4 truncate">
          {getDisplayName(member)}
        </h2>

        {/* Lucky number badge + draw state */}
        <div className="flex items-center justify-between mb-5">
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{
              background: "var(--gold-badge-bg)",
              border: "1px solid var(--gold-badge-border)",
              color: "var(--gold-badge-text)",
              letterSpacing: "0.02em",
            }}
          >
            Lucky #{member.wheelNumber}
          </span>

          {mainPayout && member.collectionConfirmedAt ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-white/50 dark:bg-white/10 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
              </svg>
              Received
            </span>
          ) : mainPayout ? (
            <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 bg-white/50 dark:bg-white/10 px-2.5 py-1 rounded-full">
              Pending Signature
            </span>
          ) : (
            <span className="text-[11px] font-bold text-blue-900 dark:text-indigo-300 bg-white/50 dark:bg-white/10 px-2.5 py-1 rounded-full">
              In the draw
            </span>
          )}
        </div>

        {/* Label + big Fraunces amount */}
        <div>
          <p className="text-[11px] font-semibold text-blue-900/60 dark:text-white/50 uppercase tracking-widest mb-1">
            {heroLabel}
          </p>
          <p
            className="font-fraunces tabular-nums leading-none"
            style={{
              fontSize: "clamp(2.5rem, 10vw, 3.25rem)",
              fontWeight: 900,
              color: "var(--hero-amount-accent)",
            }}
          >
            {heroAmount}
          </p>
          {!mainPayout && (
            <p className="text-xs text-blue-900/50 dark:text-white/40 mt-1">
              Yours when #{member.wheelNumber} is drawn · after {formatCurrency(mainFee)} fee
            </p>
          )}
          {mainPayout && !member.collectionConfirmedAt && (
            <p className="text-xs text-blue-900/50 dark:text-white/40 mt-1">
              Confirm receipt above ↑ to complete collection
            </p>
          )}
        </div>

        {/* Extra wheel sub-card */}
        {hasExtra && (
          <div className="mt-4 pt-4 border-t border-blue-300/30 dark:border-indigo-400/20">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold text-blue-900/60 dark:text-white/50 uppercase tracking-widest mb-1">
                  Extra Wheel Net
                </p>
                <p
                  className="font-fraunces text-2xl tabular-nums leading-none"
                  style={{ fontWeight: 700, color: "var(--hero-amount-accent)" }}
                >
                  {extraPayout?.amount
                    ? formatCurrency(Math.round(Number(extraPayout.amount) * 100))
                    : formatCurrency(extraNet)}
                </p>
                {member.extraWheelNumber != null && (
                  <span
                    className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-2"
                    style={{
                      background: "var(--gold-badge-bg)",
                      border: "1px solid var(--gold-badge-border)",
                      color: "var(--gold-badge-text)",
                    }}
                  >
                    Lucky #{member.extraWheelNumber}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-semibold text-blue-900/60 dark:text-white/50 uppercase tracking-widest mb-1">
                  Combined Total
                </p>
                <p
                  className="font-fraunces text-3xl tabular-nums leading-none"
                  style={{ fontWeight: 900, color: "var(--hero-amount-accent)" }}
                >
                  {formatCurrency(mainNet + extraNet)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Payment Standing ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm animate-fade-in-up-1">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Payment Standing
          </p>
          <p className="text-xs font-semibold tabular-nums" style={{ color: "var(--accent)" }}>
            Week {currentWeekNum} of {TOTAL_WEEKS}
          </p>
        </div>

        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.round((Math.min(currentWeekNum, TOTAL_WEEKS) / TOTAL_WEEKS) * 100)}%`,
              background: "var(--accent)",
            }}
          />
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
            {paidCount}{" "}
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              week{paidCount !== 1 ? "s" : ""} paid
            </span>
          </p>
          {behindCount > 0 && (
            <p className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">
              {behindCount} behind · ${owedDollars}
            </p>
          )}
        </div>

        <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mb-4">
          {member.payments.map((p) => (
            <div
              key={p.id}
              className={`flex-1 ${p.status === "PENDING" ? "bg-gray-200 dark:bg-gray-700" : ""}`}
              style={{
                background:
                  p.status === "PAID"     ? "#10b981" :
                  p.status === "LATE"     ? "#ef4444" :
                  p.status === "DEFERRED" ? "#f97316" :
                  p.status === "PARTIAL"  ? "#f59e0b" :
                  undefined,
              }}
            />
          ))}
        </div>

        <WeekStampList weeks={stampWeeks} sessionKey={token} />
      </div>

      {/* ── Calendar ─────────────────────────────────────────────────────── */}
      <EqubCalendar weeks={calendarWeeks} defaultMonth={defaultCalMonth} />

      {/* ── Record rows ──────────────────────────────────────────────────── */}
      <div className="space-y-2 animate-fade-in-up-3">
        <Link
          href={`/m/${member.token}/weeks`}
          className="group flex items-center gap-3 px-4 py-4 bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all"
        >
          <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Payment schedule</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {paidCount} of {TOTAL_WEEKS} weeks paid
            </p>
          </div>
          <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            {TOTAL_WEEKS} wks
          </span>
          <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 group-hover:text-indigo-400 dark:group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href={`/m/${member.token}/documents`}
          className="group flex items-center gap-3 px-4 py-4 bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all"
        >
          <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Documents</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Agreements, receipts &amp; rules
            </p>
          </div>
          <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            {docsCount}
          </span>
          <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 group-hover:text-indigo-400 dark:group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <AutoRefresh />
    </div>
  );
}
