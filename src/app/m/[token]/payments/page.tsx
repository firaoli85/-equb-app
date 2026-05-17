export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/equb";
import { notFound, redirect } from "next/navigation";
import { MemberPaymentGrid } from "@/components/member/MemberPaymentGrid";

export default async function MemberPaymentsPage({
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

  const [members, weeks, payments] = await Promise.all([
    db.member.findMany({
      orderBy: { wheelNumber: "asc" },
      select: {
        id: true,
        nameAmharic: true,
        nameEnglishFirst: true,
        displayPreference: true,
      },
    }),
    db.week.findMany({ orderBy: { weekNumber: "asc" } }),
    db.payment.findMany({
      select: { memberId: true, weekId: true, status: true },
    }),
  ]);

  const gridMembers = members.map((m) => ({
    id: m.id,
    nameAmharic: m.nameAmharic,
    nameEnglishFirst: m.nameEnglishFirst,
    displayPreference: m.displayPreference as "AMHARIC" | "ENGLISH",
  }));

  const gridWeeks = weeks.map((w) => ({
    id: w.id,
    weekNumber: w.weekNumber,
    date: formatDate(w.date),
    isSkipped: w.isSkipped,
  }));

  const gridPayments = payments.map((p) => ({
    memberId: p.memberId,
    weekId: p.weekId,
    status: p.status as "PENDING" | "PAID" | "LATE" | "DEFERRED",
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Payment Grid</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          All members · all 20 weeks · read-only
        </p>
      </div>
      <MemberPaymentGrid
        members={gridMembers}
        weeks={gridWeeks}
        payments={gridPayments}
      />
    </div>
  );
}
