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
  TOTAL_WEEKS,
} from "@/lib/equb";
import { statusColor, paymentMethodLabel } from "@/lib/utils";
import { notFound } from "next/navigation";
import { ConfirmAgreement } from "@/components/member/ConfirmAgreement";
import { ConfirmCollectionReceipt } from "@/components/member/ConfirmCollectionReceipt";
import { NameToggle } from "@/components/member/NameToggle";

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

  // ── Gate: show participation agreement before anything else ───────────────
  if (!member.confirmedAt) {
    return (
      <ConfirmAgreement
        token={member.token}
        memberName={member.nameAmharic}
        weeklyAmountFormatted={formatCurrency(member.weeklyAmount)}
      />
    );
  }

  // ── Extra data for stats ───────────────────────────────────────────────────
  const [drawnWeeks, allMembersWheels] = await Promise.all([
    db.week.findMany({
      where: { winnerWheelNumber: { not: null } },
      select: { winnerWheelNumber: true },
    }),
    db.member.findMany({
      select: { wheelNumber: true, extraWheelNumber: true, wheelSuspended: true },
    }),
  ]);

  const drawnSet = new Set(drawnWeeks.map((w) => w.winnerWheelNumber!));
  const collectionsCount = drawnSet.size;

  let wheelEntriesRemaining = 0;
  for (const m of allMembersWheels) {
    if (m.wheelSuspended) continue;
    if (!drawnSet.has(m.wheelNumber)) wheelEntriesRemaining++;
    if (m.extraWheelNumber !== null && !drawnSet.has(m.extraWheelNumber)) wheelEntriesRemaining++;
  }

  const currentWeekNum = getCurrentWeekNumber();
  const currentWeekPayment = member.payments.find((p) => p.week.weekNumber === currentWeekNum);
  const currentWeekDate = currentWeekPayment ? formatDate(currentWeekPayment.week.date) : null;
  const weeksRemaining = Math.max(0, TOTAL_WEEKS - currentWeekNum);

  // ── Calculations ──────────────────────────────────────────────────────────
  const grossCents = calculateMemberGross(member.weeklyAmount);
  const feeCents = calculateMemberFee(member.weeklyAmount);
  const netCents = calculateNetPayout(grossCents, feeCents);

  const paidCount = member.payments.filter((p) => p.status === "PAID").length;
  const progressPct = Math.round((paidCount / TOTAL_WEEKS) * 100);

  const payoutPayment = member.payments.find(
    (p) => p.week.weekNumber === member.wheelNumber
  );
  const payoutDate = payoutPayment ? formatDate(payoutPayment.week.date) : "TBD";

  // ── Check if member has won ───────────────────────────────────────────────
  const winnerWeek = await db.week.findFirst({
    where: {
      OR: [
        { winnerWheelNumber: member.wheelNumber },
        ...(member.extraWheelNumber !== null
          ? [{ winnerWheelNumber: member.extraWheelNumber }]
          : []),
      ],
    },
  });

  const hasWon = winnerWeek !== null;
  const remainingWeeks = TOTAL_WEEKS - paidCount;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3 text-center shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Target Pot</p>
          <p className="text-base font-black text-gray-900 dark:text-white">$20,000</p>
        </div>
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3 text-center shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">
            {currentWeekNum === 0 ? "Starts" : `Week ${currentWeekNum}`}
          </p>
          <p className="text-base font-black text-gray-900 dark:text-white">
            {currentWeekNum === 0 ? "May 17" : currentWeekDate ?? `of ${TOTAL_WEEKS}`}
          </p>
          {weeksRemaining > 0 && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{weeksRemaining} remaining</p>
          )}
        </div>
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3 text-center shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Collected</p>
          <p className="text-base font-black text-gray-900 dark:text-white">{collectionsCount}<span className="text-xs text-gray-400 font-normal">/{TOTAL_WEEKS}</span></p>
        </div>
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3 text-center shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">On Wheel</p>
          <p className="text-base font-black text-gray-900 dark:text-white">{wheelEntriesRemaining}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">remaining</p>
        </div>
      </div>

      {/* ── Animate header icon ────────────────────────────────────────────── */}
      <div className="text-center animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 dark:bg-emerald-950 rounded-2xl mb-3">
          <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Your Equb Summary</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">20-Week Rotating Savings</p>
      </div>

      {/* ── Collection Receipt Agreement ───────────────────────────────────── */}
      {hasWon && !member.collectionConfirmedAt && (
        <div className="animate-fade-in-up">
          <ConfirmCollectionReceipt
            token={member.token}
            memberName={member.nameAmharic}
            weeklyAmountFormatted={formatCurrency(member.weeklyAmount)}
            netFormatted={formatCurrency(netCents)}
            feeFormatted={formatCurrency(feeCents)}
            payoutDate={winnerWeek ? formatDate(winnerWeek.date) : "TBD"}
            winnerWheelNumber={winnerWeek?.winnerWheelNumber ?? member.wheelNumber}
            remainingWeeks={remainingWeeks}
          />
        </div>
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

      {/* ── Payout card ────────────────────────────────────────────────────── */}
      <div className="bg-emerald-600 rounded-2xl p-6 shadow-sm animate-fade-in-up-2">
        <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-4">Your Payout</p>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="text-xs text-emerald-300 mb-0.5">Payout Date</p>
            <p className="text-base font-bold text-white">{payoutDate}</p>
            <p className="text-xs text-emerald-300">Week {member.wheelNumber}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-300 mb-0.5">Total Contributed</p>
            <p className="text-base font-bold text-white">{formatCurrency(grossCents)}</p>
            <p className="text-xs text-emerald-400">{formatCurrency(member.weeklyAmount)} × {TOTAL_WEEKS} wks</p>
          </div>
          <div>
            <p className="text-xs text-emerald-300 mb-0.5">Management Fee</p>
            <p className="text-base font-bold text-amber-300">−{formatCurrency(feeCents)}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-300 mb-0.5">Net Payout</p>
            <p className="text-2xl font-black text-white">{formatCurrency(netCents)}</p>
          </div>
        </div>
      </div>

      {/* ── Progress ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm animate-fade-in-up-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payment Progress</h3>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{paidCount}/{TOTAL_WEEKS} weeks</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right">{progressPct}% complete</p>
      </div>

      {/* ── Documents ──────────────────────────────────────────────────────── */}
      <div className="space-y-3 animate-fade-in-up-4">
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
          <a
            href={`/api/receipt/${member.token}`}
            className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            Download PDF
          </a>
        </div>

        {hasWon && member.collectionConfirmedAt && (
          <div className="bg-white dark:bg-[#141414] border border-blue-200 dark:border-blue-800 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Collection Receipt Signed</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {new Date(member.collectionConfirmedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC
                </p>
              </div>
            </div>
            <a
              href={`/api/collection-receipt/${member.token}`}
              className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
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
          {member.payments.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                p.week.weekNumber === member.wheelNumber ? "bg-emerald-50 dark:bg-emerald-950/40" : ""
              }`}
            >
              <div className="w-7 text-xs text-gray-400 dark:text-gray-500 text-center font-mono shrink-0">
                {p.week.weekNumber}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(p.week.date)}</p>
                {p.week.weekNumber === member.wheelNumber && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">★ Your payout week</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.method && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {paymentMethodLabel(p.method as "CASH" | "ZELLE" | "OTHER")}
                  </span>
                )}
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColor(
                    p.status as "PENDING" | "PAID" | "LATE"
                  )}`}
                >
                  {p.status === "PAID" ? "Paid" : p.status === "LATE" ? "Late" : "Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
