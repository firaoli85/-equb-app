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
  EQUB_START,  // fallback for week1Date when no payments loaded yet
} from "@/lib/equb";
import { statusColor, paymentMethodLabel } from "@/lib/utils";
import { notFound } from "next/navigation";
import { ConfirmAgreement } from "@/components/member/ConfirmAgreement";
import { ConfirmCollectionReceipt } from "@/components/member/ConfirmCollectionReceipt";
import { NameToggle } from "@/components/member/NameToggle";
import { AutoRefresh } from "@/components/member/AutoRefresh";
import { ReviewRequestButton } from "@/components/member/ReviewRequestButton";

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

  // ── Gate: show participation agreement before anything else ───────────────
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

  // ── Per-wheel amounts ─────────────────────────────────────────────────────
  const mainWeekly = mainWheelWeekly(member.weeklyAmount, hasExtra);
  const extraWeekly = hasExtra ? extraWheelWeekly(member.weeklyAmount) : 0;

  const mainGross = calculateMemberGross(mainWeekly);
  const mainFee   = calculateMemberFee(mainWeekly);
  const mainNet   = calculateNetPayout(mainGross, mainFee);

  const extraGross = hasExtra ? calculateMemberGross(extraWeekly) : 0;
  const extraFee   = hasExtra ? calculateMemberFee(extraWeekly) : 0;
  const extraNet   = hasExtra ? calculateNetPayout(extraGross, extraFee) : 0;

  // ── Stats queries + review requests ──────────────────────────────────────
  const [drawnWeeks, allMembersWheels, reviewRequests] = await Promise.all([
    db.week.findMany({
      where: { winnerWheelNumber: { not: null } },
      select: { winnerWheelNumber: true, weekNumber: true, date: true, payoutStatus: true, payoutMethod: true },
    }),
    db.member.findMany({
      select: { wheelNumber: true, extraWheelNumber: true, wheelSuspended: true },
    }),
    db.paymentReviewRequest.findMany({
      where: { memberId: member.id },
      select: { weekId: true, status: true },
    }),
  ]);

  const drawnSet = new Set(drawnWeeks.map((w) => w.winnerWheelNumber!));
  const collectionsCount = drawnSet.size;

  // Map weekId → review status for quick lookup in the payment table
  const reviewByWeekId = new Map(
    reviewRequests.map((r) => [r.weekId, r.status as "PENDING" | "APPROVED" | "REJECTED"])
  );

  let wheelEntriesRemaining = 0;
  for (const m of allMembersWheels) {
    if (m.wheelSuspended) continue;
    if (!drawnSet.has(m.wheelNumber)) wheelEntriesRemaining++;
    if (m.extraWheelNumber !== null && !drawnSet.has(m.extraWheelNumber)) wheelEntriesRemaining++;
  }

  const week1Date = member.payments.find((p) => p.week.weekNumber === 1)?.week.date ?? EQUB_START;
  const currentWeekNum = getCurrentWeekNumber(week1Date);
  const currentWeekPayment = member.payments.find((p) => p.week.weekNumber === currentWeekNum);
  const currentWeekDate = currentWeekPayment ? formatDate(currentWeekPayment.week.date) : null;
  const weeksRemaining = Math.max(0, TOTAL_WEEKS - currentWeekNum);

  // ── Per-wheel winning week lookup ─────────────────────────────────────────
  const mainWinnerWeek  = drawnWeeks.find((w) => w.winnerWheelNumber === member.wheelNumber) ?? null;
  const extraWinnerWeek = hasExtra
    ? drawnWeeks.find((w) => w.winnerWheelNumber === member.extraWheelNumber) ?? null
    : null;

  const paidCount  = member.payments.filter((p) => p.status === "PAID").length;
  const progressPct = Math.round((paidCount / TOTAL_WEEKS) * 100);
  const remainingWeeks = TOTAL_WEEKS - paidCount;

  // ── Payout week date for the payment table annotation ────────────────────
  const payoutPayment = member.payments.find((p) => p.week.weekNumber === member.wheelNumber);
  const mainPayoutDate = payoutPayment ? formatDate(payoutPayment.week.date) : "TBD";

  // ── Status helpers ────────────────────────────────────────────────────────
  function wheelStatusBadge(winnerWeek: typeof mainWinnerWeek, confirmed: boolean) {
    if (!winnerWeek) return { label: "Pending Draw", cls: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" };
    if (confirmed)   return { label: "Collected",    cls: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" };
    return           { label: "Pending Signature", cls: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800" };
  }

  const mainStatus  = wheelStatusBadge(mainWinnerWeek,  !!member.collectionConfirmedAt);
  const extraStatus = hasExtra ? wheelStatusBadge(extraWinnerWeek, !!member.collectionConfirmedAtExtra) : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

      {/* ── Stats section ──────────────────────────────────────────────────── */}
      <div className="space-y-3">

        {/* Hero card: Target Pot */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 px-5 py-5 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Target Pot</p>
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 leading-none">$20,000</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">20-week rotating savings group</p>
          </div>
          <div className="shrink-0 w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-900">
            <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* 2×2 stat cards */}
        <div className="grid grid-cols-2 gap-3">

          {/* Starts */}
          <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Starts</p>
            <p className="text-base font-black text-gray-900 dark:text-white leading-snug">{formatDate(week1Date)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {currentWeekNum === 0 ? "Not yet started" : `Week ${currentWeekNum} active`}
            </p>
          </div>

          {/* Weeks Remaining */}
          <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Weeks Left</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-gray-900 dark:text-white leading-none">{weeksRemaining}</p>
              <p className="text-sm font-bold text-gray-400 dark:text-gray-500">of {TOTAL_WEEKS}</p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">remaining</p>
          </div>

          {/* Collected */}
          <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Collected</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-gray-900 dark:text-white leading-none">{collectionsCount}</p>
              <p className="text-sm font-bold text-gray-400 dark:text-gray-500">of {TOTAL_WEEKS}</p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">payouts issued</p>
          </div>

          {/* On Wheel */}
          <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">On Wheel</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white leading-none">{wheelEntriesRemaining}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">entries remaining</p>
          </div>

        </div>
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="text-center animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 dark:bg-emerald-950 rounded-2xl mb-3">
          <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Your Equb Summary</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">20-Week Rotating Savings</p>
      </div>

      {/* ── Collection receipt confirmations (shown when a wheel wins) ─────── */}
      {mainWinnerWeek && !member.collectionConfirmedAt && (
        <ConfirmCollectionReceipt
          token={member.token}
          memberNameEnglish={memberNameEnglish || member.nameAmharic}
          memberNameAmharic={member.nameAmharic}
          weeklyAmountFormatted={formatCurrency(mainWeekly)}
          netFormatted={formatCurrency(mainNet)}
          feeFormatted={formatCurrency(mainFee)}
          payoutDate={formatDate(mainWinnerWeek.date)}
          winnerWheelNumber={mainWinnerWeek.winnerWheelNumber!}
          remainingWeeks={remainingWeeks}
          wheelType="main"
        />
      )}
      {hasExtra && extraWinnerWeek && !member.collectionConfirmedAtExtra && (
        <ConfirmCollectionReceipt
          token={member.token}
          memberNameEnglish={memberNameEnglish || member.nameAmharic}
          memberNameAmharic={member.nameAmharic}
          weeklyAmountFormatted={formatCurrency(extraWeekly)}
          netFormatted={formatCurrency(extraNet)}
          feeFormatted={formatCurrency(extraFee)}
          payoutDate={formatDate(extraWinnerWeek.date)}
          winnerWheelNumber={extraWinnerWeek.winnerWheelNumber!}
          remainingWeeks={remainingWeeks}
          wheelType="extra"
        />
      )}

      {/* ── Member card ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm animate-fade-in-up-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{getDisplayName(member)}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Weekly contribution:{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {formatCurrency(member.weeklyAmount)}
              </span>
            </p>
            <div className="mt-2">
              <NameToggle token={member.token} current={member.displayPreference} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-sm font-bold px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Wheel #{member.wheelNumber}
            </span>
            {member.extraWheelNumber && (
              <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                + Wheel #{member.extraWheelNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Payout cards ───────────────────────────────────────────────────── */}

      {/* Card 1: Main wheel entry */}
      <PayoutCard
        label="Main Wheel Entry"
        wheelNumber={member.wheelNumber}
        weeklyAmount={mainWeekly}
        gross={mainGross}
        fee={mainFee}
        net={mainNet}
        payoutDate={mainPayoutDate}
        status={mainStatus}
        confirmedAt={member.collectionConfirmedAt}
        pdfHref={mainWinnerWeek && member.collectionConfirmedAt ? `/api/collection-receipt/${member.token}` : null}
      />

      {/* Card 2: Extra wheel entry */}
      {hasExtra && member.extraWheelNumber && (
        <PayoutCard
          label="Extra Wheel Entry"
          wheelNumber={member.extraWheelNumber}
          weeklyAmount={extraWeekly}
          gross={extraGross}
          fee={extraFee}
          net={extraNet}
          payoutDate={
            member.payments.find((p) => p.week.weekNumber === member.extraWheelNumber)
              ? formatDate(member.payments.find((p) => p.week.weekNumber === member.extraWheelNumber)!.week.date)
              : "TBD"
          }
          status={extraStatus!}
          confirmedAt={member.collectionConfirmedAtExtra}
          pdfHref={extraWinnerWeek && member.collectionConfirmedAtExtra ? `/api/collection-receipt/${member.token}?wheel=extra` : null}
          accent="blue"
        />
      )}

      {/* Card 3: Combined total (only when has extra wheel) */}
      {hasExtra && (
        <div className="bg-gray-900 dark:bg-gray-950 rounded-2xl p-6 shadow-sm border border-gray-700 dark:border-gray-800">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Combined Total</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Total Gross</p>
              <p className="text-base font-bold text-white">{formatCurrency(mainGross + extraGross)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Total Fees</p>
              <p className="text-base font-bold text-amber-400">−{formatCurrency(mainFee + extraFee)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Total Net</p>
              <p className="text-xl font-black text-emerald-400">{formatCurrency(mainNet + extraNet)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            {formatCurrency(member.weeklyAmount)}/week × {TOTAL_WEEKS} weeks
          </p>
        </div>
      )}

      {/* ── Progress ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm animate-fade-in-up-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payment Progress</h3>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{paidCount}/{TOTAL_WEEKS} weeks</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-1.5 overflow-hidden">
          <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right">{progressPct}% complete</p>
      </div>

      {/* ── Documents ──────────────────────────────────────────────────────── */}
      <div className="space-y-3 animate-fade-in-up-4">
        {/* Participation Agreement */}
        <div className="bg-white dark:bg-[#141414] border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Participation Agreement Signed</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {new Date(member.confirmedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC
              </p>
            </div>
          </div>
          <a href={`/api/receipt/${member.token}`} className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
            Download PDF
          </a>
        </div>

        {/* Main wheel collection receipt */}
        {mainWinnerWeek && member.collectionConfirmedAt && (
          <div className="bg-white dark:bg-[#141414] border border-blue-200 dark:border-blue-800 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Collection Receipt Signed — Wheel #{member.wheelNumber}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {new Date(member.collectionConfirmedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC
                </p>
              </div>
            </div>
            <a href={`/api/collection-receipt/${member.token}`} className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
              Download PDF
            </a>
          </div>
        )}

        {/* Extra wheel collection receipt */}
        {hasExtra && extraWinnerWeek && member.collectionConfirmedAtExtra && (
          <div className="bg-white dark:bg-[#141414] border border-purple-200 dark:border-purple-800 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Extra Wheel Receipt Signed — Wheel #{member.extraWheelNumber}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {new Date(member.collectionConfirmedAtExtra).toLocaleString("en-US", { timeZone: "UTC" })} UTC
                </p>
              </div>
            </div>
            <a href={`/api/collection-receipt/${member.token}?wheel=extra`} className="shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
              Download PDF
            </a>
          </div>
        )}
      </div>

      {/* ── Payment table ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden animate-fade-in-up-4">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">20-Week Payment Schedule</h3>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {member.payments.map((p) => {
            const isMainWeek  = p.week.weekNumber === member.wheelNumber;
            const isExtraWeek = hasExtra && p.week.weekNumber === member.extraWheelNumber;
            const diff = p.week.weekNumber - currentWeekNum;
            const reviewEligible = diff >= -2 && diff <= 2;
            const existingReview = reviewByWeekId.get(p.weekId) ?? null;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                  isMainWeek ? "bg-emerald-50 dark:bg-emerald-950/40" :
                  isExtraWeek ? "bg-blue-50 dark:bg-blue-950/30" : ""
                }`}
              >
                <div className="w-7 text-xs text-gray-400 dark:text-gray-500 text-center font-mono shrink-0">
                  {p.week.weekNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(p.week.date)}</p>
                  {isMainWeek && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">★ Main wheel payout week</p>}
                  {isExtraWeek && <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">★ Extra wheel payout week</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {reviewEligible && (
                    <ReviewRequestButton
                      token={member.token}
                      weekId={p.weekId}
                      weekNumber={p.week.weekNumber}
                      weekDate={formatDate(p.week.date)}
                      existingStatus={existingReview}
                    />
                  )}
                  {p.method && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{paymentMethodLabel(p.method as "CASH" | "ZELLE" | "OTHER")}</span>
                  )}
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColor(p.status as "PENDING" | "PAID" | "LATE")}`}>
                    {p.status === "PAID" ? "Paid" : p.status === "LATE" ? "Late" : "Pending"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <AutoRefresh />
      </div>

    </div>
  );
}

// ── PayoutCard component ──────────────────────────────────────────────────────

function PayoutCard({
  label,
  wheelNumber,
  weeklyAmount,
  gross,
  fee,
  net,
  payoutDate,
  status,
  confirmedAt,
  pdfHref,
  accent = "emerald",
}: {
  label: string;
  wheelNumber: number;
  weeklyAmount: number;
  gross: number;
  fee: number;
  net: number;
  payoutDate: string;
  status: { label: string; cls: string };
  confirmedAt: Date | null;
  pdfHref: string | null;
  accent?: "emerald" | "blue";
}) {
  const bg = accent === "blue"
    ? "bg-blue-600"
    : "bg-emerald-600";

  return (
    <div className={`${bg} rounded-2xl p-6 shadow-sm`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold text-white/60 uppercase tracking-widest">{label}</p>
          <p className="text-sm font-bold text-white mt-0.5">Wheel #{wheelNumber}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>
            {status.label}
          </span>
          {confirmedAt && pdfHref && (
            <a
              href={pdfHref}
              className="text-xs text-white/70 hover:text-white underline underline-offset-2 transition-colors"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-white/60 mb-0.5">Weekly Portion</p>
          <p className="text-base font-bold text-white">{formatCurrency(weeklyAmount)}</p>
          <p className="text-xs text-white/50">× {TOTAL_WEEKS} weeks</p>
        </div>
        <div>
          <p className="text-xs text-white/60 mb-0.5">Payout Date</p>
          <p className="text-base font-bold text-white">{payoutDate}</p>
        </div>
        <div>
          <p className="text-xs text-white/60 mb-0.5">Gross Payout</p>
          <p className="text-base font-bold text-white">{formatCurrency(gross)}</p>
        </div>
        <div>
          <p className="text-xs text-white/60 mb-0.5">Management Fee</p>
          <p className="text-base font-bold text-amber-300">−{formatCurrency(fee)}</p>
        </div>
        <div className="col-span-2 pt-1 border-t border-white/20">
          <p className="text-xs text-white/60 mb-0.5">Net Payout</p>
          <p className="text-2xl font-black text-white">{formatCurrency(net)}</p>
        </div>
      </div>
    </div>
  );
}
