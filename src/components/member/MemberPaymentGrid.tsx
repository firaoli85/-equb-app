import { getDisplayName } from "@/lib/equb";

type Status = "PENDING" | "PAID" | "LATE" | "DEFERRED";

interface GridMember {
  id: string;
  nameAmharic: string;
  nameEnglishFirst: string;
  displayPreference: "AMHARIC" | "ENGLISH";
}

interface GridWeek {
  id: string;
  weekNumber: number;
  date: string;
  isSkipped: boolean;
}

interface GridPayment {
  memberId: string;
  weekId: string;
  status: Status;
}

interface Props {
  members: GridMember[];
  weeks: GridWeek[];
  payments: GridPayment[];
}

function cellClass(status: Status, isSkipped: boolean): string {
  if (isSkipped) return "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600";
  if (status === "PAID")     return "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800";
  if (status === "LATE")     return "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800";
  if (status === "DEFERRED") return "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800";
  return "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-700";
}

const STATUS_ICON: Record<Status, React.ReactNode> = {
  PAID:     "✓",
  LATE:     "!",
  PENDING:  "−",
  DEFERRED: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
    </svg>
  ),
};

export function MemberPaymentGrid({ members, weeks, payments }: Props) {
  const paymentMap = new Map(payments.map((p) => [`${p.memberId}:${p.weekId}`, p]));

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse" style={{ minWidth: "max-content" }}>
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="sticky left-0 z-20 bg-white dark:bg-[#141414] text-left px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r-2 border-gray-200 dark:border-gray-700 min-w-[5.5rem] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.4)]">
                Week
              </th>
              {members.map((m) => (
                <th
                  key={m.id}
                  className="px-2 py-3 text-center font-medium text-gray-700 dark:text-gray-300 min-w-[4rem] whitespace-nowrap"
                >
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {getDisplayName(m)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {weeks.map((week) => (
              <tr
                key={week.id}
                className={
                  week.isSkipped
                    ? "opacity-40 bg-red-50/50 dark:bg-red-950/10"
                    : "hover:bg-gray-50/40 dark:hover:bg-gray-800/20"
                }
              >
                <td className="sticky left-0 z-10 bg-white dark:bg-[#141414] px-3 py-2 border-r-2 border-gray-200 dark:border-gray-700 whitespace-nowrap shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.4)]">
                  <div className="font-semibold text-gray-900 dark:text-white text-xs">Wk {week.weekNumber}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">{week.date}</div>
                  {week.isSkipped && <span className="text-red-400 text-xs font-semibold">SKIP</span>}
                </td>

                {members.map((m) => {
                  const p = paymentMap.get(`${m.id}:${week.id}`);
                  const status: Status = p?.status ?? "PENDING";
                  return (
                    <td key={m.id} className="px-2 py-2 text-center">
                      <div
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${cellClass(status, week.isSkipped)}`}
                      >
                        {week.isSkipped ? "—" : STATUS_ICON[status]}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex gap-5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 inline-block" />
          Paid
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 inline-block" />
          Late
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 inline-block" />
          Deferred
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 inline-block" />
          Pending
        </span>
      </div>
    </div>
  );
}
