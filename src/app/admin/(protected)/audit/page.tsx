export const dynamic = "force-dynamic";

import { db } from "@/lib/db";

const PAGE_SIZE = 50;

const DOT_COLOR: Record<string, string> = {
  Payment: "bg-emerald-500",
  Member: "bg-blue-500",
  Week: "bg-amber-500",
};

const BADGE_COLOR: Record<string, string> = {
  Payment:
    "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  Member:
    "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  Week: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const type = params.type ?? "";
  const where = type ? { entityType: type } : {};

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
        <div className="flex gap-2 flex-wrap">
          {["", "Payment", "Member", "Week"].map((t) => (
            <a
              key={t}
              href={t ? `/admin/audit?type=${t}` : "/admin/audit"}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                type === t
                  ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-[#141414]"
              }`}
            >
              {t || "All"}
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-16 text-center text-gray-400">No log entries yet.</div>
        ) : (
          <div className="p-6">
            <div className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-800 space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  <div
                    className={`absolute -left-[25px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#141414] ${
                      DOT_COLOR[log.entityType] ?? "bg-gray-400"
                    }`}
                  />
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                    {log.action}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        BADGE_COLOR[log.entityType] ??
                        "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {log.entityType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Page {page} of {totalPages} ({total} entries)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`/admin/audit?page=${page - 1}${type ? `&type=${type}` : ""}`}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-[#141414] text-gray-700 dark:text-gray-300"
              >
                ← Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/admin/audit?page=${page + 1}${type ? `&type=${type}` : ""}`}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-[#141414] text-gray-700 dark:text-gray-300"
              >
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
