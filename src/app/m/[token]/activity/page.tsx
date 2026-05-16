export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

export default async function MemberActivityPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const viewer = await db.member.findUnique({
    where: { token },
    select: { confirmedAt: true },
  });
  if (!viewer) notFound();
  if (!viewer.confirmedAt) redirect(`/m/${token}`);

  // Show only public events: payment updates and week events
  // Excludes: member edits, suspensions, token regeneration, admin operations
  const logs = await db.auditLog.findMany({
    where: {
      entityType: { in: ["Payment", "Week"] },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  function eventIcon(entityType: string, action: string) {
    if (entityType === "Payment") {
      if (action.includes("paid")) return { icon: "✓", cls: "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" };
      if (action.includes("late")) return { icon: "!", cls: "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400" };
      return { icon: "−", cls: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" };
    }
    if (action.includes("drawn") || action.includes("wheel")) return { icon: "🎡", cls: "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400" };
    if (action.includes("skip")) return { icon: "⊘", cls: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400" };
    if (action.includes("payout") || action.includes("collected")) return { icon: "✓", cls: "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" };
    return { icon: "·", cls: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" };
  }

  function formatTimestamp(date: Date) {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC";
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Activity</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          Payment updates and collection events · read-only
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 font-medium">No activity yet</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {logs.map((log) => {
              const { icon, cls } = eventIcon(log.entityType, log.action.toLowerCase());
              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${cls}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{log.action}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatTimestamp(log.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
