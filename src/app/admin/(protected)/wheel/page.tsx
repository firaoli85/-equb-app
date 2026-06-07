export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { mainWheelWeekly, extraWheelWeekly } from "@/lib/equb";
import { WheelSetup } from "@/components/admin/WheelSetup";

export default async function WheelSetupPage() {
  const [slots, config, members, drawnWeeks] = await Promise.all([
    db.wheelSlot.findMany({ orderBy: { position: "asc" } }),
    db.wheelConfig.findUnique({ where: { id: 1 } }),
    db.member.findMany({
      where: { isArchived: false },
      orderBy: { wheelNumber: "asc" },
      select: {
        nameAmharic: true,
        weeklyAmount: true,
        wheelNumber: true,
        extraWheelNumber: true,
      },
    }),
    db.week.findMany({
      where: { winnerWheelNumber: { not: null } },
      select: { winnerWheelNumber: true },
    }),
  ]);

  // Map each lucky number to the weekly amount it represents and its member name
  const numberInfo: Record<number, { memberName: string; amountCents: number }> = {};
  const memberNumbers = new Set<number>();

  for (const m of members) {
    const hasExtra = m.extraWheelNumber != null;
    numberInfo[m.wheelNumber] = {
      memberName: m.nameAmharic,
      amountCents: mainWheelWeekly(m.weeklyAmount, hasExtra),
    };
    memberNumbers.add(m.wheelNumber);

    if (m.extraWheelNumber != null) {
      numberInfo[m.extraWheelNumber] = {
        memberName: m.nameAmharic,
        amountCents: extraWheelWeekly(m.weeklyAmount),
      };
      memberNumbers.add(m.extraWheelNumber);
    }
  }

  // Mismatch detection
  const slotNumbers = new Set(slots.flatMap((s) => s.numbers));
  const onMemberNotInSlot = [...memberNumbers]
    .filter((n) => !slotNumbers.has(n))
    .sort((a, b) => a - b);
  const inSlotNotOnMember = [...slotNumbers]
    .filter((n) => !memberNumbers.has(n))
    .sort((a, b) => a - b);

  const drawnNumbers = drawnWeeks.map((w) => w.winnerWheelNumber!);
  const allMemberNumbers = [...memberNumbers].sort((a, b) => a - b);
  const hasIssues = onMemberNotInSlot.length > 0 || inSlotNotOnMember.length > 0;

  // Key forces the client component to remount when DB slot state changes
  const slotKey = slots
    .map((s) => `${s.position}:${[...s.numbers].sort((a, b) => a - b).join(",")}`)
    .join("|");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wheel Setup</h1>

      {/* Mismatch banner */}
      {!hasIssues ? (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-5 py-4">
          <svg
            className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            All numbers matched — every member number is in a slot, no slot contains an orphan.
          </p>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4 space-y-3">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
            Number mismatches detected — fix before the next spin.
          </p>
          {onMemberNotInSlot.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1.5">
                On a member but in no slot — can never be drawn
              </p>
              <div className="flex flex-wrap gap-1.5">
                {onMemberNotInSlot.map((n) => (
                  <span
                    key={n}
                    className="px-2.5 py-0.5 rounded-full text-sm font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                  >
                    #{n}{numberInfo[n] ? ` — ${numberInfo[n].memberName}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
          {inSlotNotOnMember.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1.5">
                In a slot but no member owns it — ghost number, drag to Unassigned to remove
              </p>
              <div className="flex flex-wrap gap-1.5">
                {inSlotNotOnMember.map((n) => (
                  <span
                    key={n}
                    className="px-2.5 py-0.5 rounded-full text-sm font-bold bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700"
                  >
                    #{n}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <WheelSetup
        key={slotKey}
        initialSlots={slots.map((s) => ({ position: s.position, numbers: s.numbers }))}
        initialPriorityNums={config?.priorityNumbers ?? []}
        numberInfo={numberInfo}
        drawnNumbers={drawnNumbers}
        allMemberNumbers={allMemberNumbers}
      />
    </div>
  );
}
