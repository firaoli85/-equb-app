export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/equb";
import PaymentGrid from "@/components/admin/PaymentGrid";

export default async function PaymentsPage() {
  const [members, weeks, payments] = await Promise.all([
    db.member.findMany({ orderBy: { wheelNumber: "asc" } }),
    db.week.findMany({ orderBy: { weekNumber: "asc" } }),
    db.payment.findMany(),
  ]);

  const gridData = {
    members: members.map((m) => ({ id: m.id, nameAmharic: m.nameAmharic, nameEnglishFirst: m.nameEnglishFirst, wheelNumber: m.wheelNumber })),
    weeks: weeks.map((w) => ({
      id: w.id,
      weekNumber: w.weekNumber,
      date: formatDate(w.date),
      isSkipped: w.isSkipped,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      memberId: p.memberId,
      weekId: p.weekId,
      status: p.status as "PENDING" | "PAID" | "LATE",
      method: p.method as "CASH" | "ZELLE" | "OTHER" | null,
      notes: p.notes,
    })),
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Click any cell to update payment status. Rows = weeks, columns = members.
      </p>
      <PaymentGrid data={gridData} />
    </div>
  );
}
