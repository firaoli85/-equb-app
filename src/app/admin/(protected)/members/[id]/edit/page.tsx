export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { EditMemberForm } from "@/components/admin/EditMemberForm";
import Link from "next/link";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const member = await db.member.findUnique({ where: { id } });
  if (!member) notFound();

  const wonPayouts = await db.weekPayout.findMany({
    where: { memberId: member.id },
    select: { number: true },
  });
  const wonSet = new Set(wonPayouts.map((p) => p.number));
  const mainWon = wonSet.has(member.wheelNumber);
  const extraWon = member.extraWheelNumber != null && wonSet.has(member.extraWheelNumber);

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/members"
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          ← Members
        </Link>
        <span className="text-gray-200 dark:text-gray-700">/</span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Member</h1>
      </div>

      <EditMemberForm
        memberId={member.id}
        hasPinSet={!!member.pin}
        mainWon={mainWon}
        extraWon={extraWon}
        defaults={{
          nameAmharic: member.nameAmharic,
          nameEnglishFirst: member.nameEnglishFirst,
          nameEnglishLast: member.nameEnglishLast,
          phone: member.phone ?? "",
          weeklyAmount: member.weeklyAmount / 100,
          wheelNumber: member.wheelNumber,
          extraWheelNumber: member.extraWheelNumber ?? undefined,
          displayPreference: member.displayPreference,
        }}
      />
    </div>
  );
}
