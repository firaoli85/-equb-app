export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

function fmtTimestamp(d: Date) {
  return d.toLocaleString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "UTC",
  }) + " UTC";
}

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const member = await db.member.findUnique({
    where: { token },
    select: {
      confirmedAt: true,
      collectionConfirmedAt: true,
      collectionConfirmedAtExtra: true,
      wheelNumber: true,
      extraWheelNumber: true,
    },
  });
  if (!member) notFound();
  if (!member.confirmedAt) redirect(`/m/${token}`);

  // Determine if member has won (their wheel number has been drawn)
  const drawnWeeks = await db.week.findMany({
    where: { winnerWheelNumber: { not: null } },
    select: { winnerWheelNumber: true },
  });
  const drawnNumbers = new Set(drawnWeeks.map((w) => w.winnerWheelNumber!));
  const hasWonMain  = drawnNumbers.has(member.wheelNumber);
  const hasWonExtra = member.extraWheelNumber !== null && drawnNumbers.has(member.extraWheelNumber);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Documents</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          Your agreements, receipts, and Equb rules
        </p>
      </div>

      {/* ── Participation Agreement ── */}
      <section className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Participation Agreement</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Signed{" "}
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {fmtTimestamp(member.confirmedAt)}
              </span>
            </p>
          </div>
          <a
            href={`/api/receipt/${token}`}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </a>
        </div>
      </section>

      {/* ── Collection Receipt(s) ── */}
      {(hasWonMain || hasWonExtra) && (
        <section className="space-y-3">
          {hasWonMain && (
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Collection Receipt — Lucky #{member.wheelNumber}
                    </h2>
                  </div>
                  {member.collectionConfirmedAt ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Signed{" "}
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {fmtTimestamp(member.collectionConfirmedAt)}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Not yet signed — you have won but not confirmed receipt
                    </p>
                  )}
                </div>
                {member.collectionConfirmedAt && (
                  <a
                    href={`/api/collection-receipt/${token}`}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          )}

          {hasWonExtra && member.extraWheelNumber && (
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      Collection Receipt — Extra Lucky #{member.extraWheelNumber}
                    </h2>
                  </div>
                  {member.collectionConfirmedAtExtra ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Signed{" "}
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {fmtTimestamp(member.collectionConfirmedAtExtra)}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Not yet signed — you have won but not confirmed receipt
                    </p>
                  )}
                </div>
                {member.collectionConfirmedAtExtra && (
                  <a
                    href={`/api/collection-receipt/${token}?wheel=extra`}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Payment History ── */}
      <section className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Payment History</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              All 20 weeks — status, amounts, and dates
            </p>
          </div>
          <a
            href={`/api/payment-history/${token}`}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gray-700 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-gray-100 text-white dark:text-gray-900 transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </a>
        </div>
      </section>

      {/* ── Equb Rules & Terms ── */}
      <section className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Equb Rules &amp; Terms</h2>
          </div>
        </div>

        <div className="px-6 py-5 space-y-8">
          {/* English */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">English</p>
            <div className="space-y-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">1. Weekly Contribution Obligation</h3>
                <p>
                  Each member is required to pay their agreed weekly contribution on or before the collection date
                  each week. Timely payment is essential to the functioning of the group. Late or missed payments
                  affect every other member and will be recorded in the audit log. Members are expected to notify
                  the administrator in advance if they anticipate difficulty paying.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">2. Refund Policy</h3>
                <p>
                  If a member wishes to withdraw from the Equb before receiving their collection, they may not
                  receive an immediate refund. The refund will be processed at the end of the Equb cycle
                  (September 27, 2026). The management fee — calculated as a percentage of the member&apos;s total
                  contribution — will be deducted from the refund amount. Members who have already received their
                  collection are not eligible for a refund and must continue paying for the duration of the cycle.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">3. Skip / Deferral Policy</h3>
                <p>
                  Members experiencing genuine financial hardship may request to defer (skip) a single week&apos;s
                  payment by submitting a <strong>Skip Request</strong> through this portal. Requests must be
                  submitted at least <strong>24 hours before</strong> the weekly collection date. The administrator
                  will review and either approve or deny the request at their discretion. Approved deferrals are
                  recorded as <em>Deferred</em> and do <strong>not</strong> count as late payments for the purpose
                  of the auto-suspension rule. Each member may be granted a limited number of deferrals per cycle;
                  repeated requests may be denied.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">4. Late Payment Policy</h3>
                <p>
                  A payment is considered late if it is not received by the administrator before the weekly
                  collection closes. Two consecutive late payments will result in the member being automatically
                  suspended from the weekly wheel draw. The suspended member remains in the Equb and must continue
                  making weekly contributions, but they will not be eligible to win the pot until the administrator
                  reinstates them. Deferred (skip-approved) weeks are <strong>excluded</strong> from the consecutive
                  late count.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">5. Dispute Resolution</h3>
                <p>
                  Any disputes regarding payments, deferrals, suspensions, or the distribution of the pot should
                  be raised directly with the Equb administrator as soon as possible. All members agree to resolve
                  disputes through respectful discussion. The administrator&apos;s decision is final in all matters
                  relating to the operation of this Equb.
                </p>
              </div>

            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* Amharic */}
          <div lang="am">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">አማርኛ</p>
            <div className="space-y-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">1. ሳምንታዊ መዋጮ ግዴታ</h3>
                <p>
                  እያንዳንዱ አባል የተስማማበትን ሳምንታዊ መዋጮ በሳምንቱ የስብስብ ቀን ወይም ቀደም ብሎ መክፈል አለበት። ወቅታዊ ክፍያ
                  ለቡድኑ አሠራር አስፈላጊ ነው። ዘለፈ ወይም ያልተከፈሉ ክፍያዎች ሌሎች አባላትን ሁሉ ስለሚጎዱ፣ ከክፍያ ጊዜ አስቀድሞ
                  ችግር ሊኖር ቢጠብቁ አስተዳዳሪውን ማሳወቅ ይጠበቅበዎታል።
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">2. ተመላሽ ፖሊሲ</h3>
                <p>
                  አባሉ ስብስቡን ከማግኘቱ/ቷ በፊት ከዕቁቡ ለመውጣት ከፈለገ/ች፣ ወዲያው ተመላሽ ገንዘብ ላይቀበሉ ይችላሉ። ተመላሹ
                  የሚፈጸመው የዕቁቡ ዑደት ሲጠናቀቅ ብቻ ነው (መስከረም 27 ቀን 2026 ዓ.ም.)። የአስተዳደር ክፍያ — ከአባሉ
                  ጠቅላላ መዋጮ በተወሰነ ፐርሰንት የሚሰላ — ከተመላሹ ላይ ይቀነሳል። ስብስቡን ቀድሞ የተቀበሉ አባላት ተመላሽ
                  አያገኙም፤ ዑደቱ እስካለቀ ድረስ መክፈላቸውን መቀጠል አለባቸው።
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">3. ማዘዋወር/እረፍት ፖሊሲ</h3>
                <p>
                  ከባድ ኢኮኖሚያዊ ችግር ያለባቸው አባላት በዚህ ፖርታል በኩል <strong>የማዘዋወር ጥያቄ</strong> ማቅረብ ይችላሉ።
                  ጥያቄዎች ቢያንስ <strong>ከ24 ሰዓት በፊት</strong> ቀርበው መጽደቅ አለባቸው። አስተዳዳሪው ጥያቄውን ይገመግሞ
                  ያጸድቃል ወይም ይቃወማል። የጸደቁ ማዘዋወሮች እንደ <em>ዘለፈ ክፍያ ሳይቆጠሩ</em> ይመዘገባሉ። ደጋጋሚ ጥያቄዎች
                  ሊቃወሙ ይችላሉ።
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">4. ዘለፈ ክፍያ ፖሊሲ</h3>
                <p>
                  ክፍያ ሳምንታዊ ስብስቡ ከመዘጋቱ በፊት ካልተፈጸመ ዘለፈ ተብሎ ይቆጠራል። ሁለት ተከታታይ ዘለፈ ክፍያዎች
                  አባሉን ከሳምንታዊ ዕጣ ጽሑፍ ሊያሠናክለው ይችላሉ። ታግዶ የቀረ አባሉ ዕቁቡ ውስጥ ቢቆይም አስተዳዳሪው
                  እስካልመለሰው ድረስ ሸልማቱን ማሸነፍ አይችልም። የጸደቁ ማዘዋወሮች (እረፍቶች) ተከታታይ ዘለፈ ቁጥር
                  <strong> አይጨምሩም</strong>።
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">5. አለመግባባት መፍቻ</h3>
                <p>
                  ክፍያዎች፣ ማዘዋወሮች፣ ታግዶ መቀረቶች ወይም ሸልማቱ አሰጣጥ ዙሪያ ማናቸውም አለመግባባቶች ቀጥታ ከዕቁቡ
                  አስተዳዳሪ ጋር በፍጥነት ይነጋገሩ። ሁሉም አባላት አለመግባባቶቻቸውን በጋራ ውይይት ለመፍታት ይስማማሉ።
                  አስተዳዳሪው ውሳኔ ፍጹምና የመጨረሻ ነው።
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
