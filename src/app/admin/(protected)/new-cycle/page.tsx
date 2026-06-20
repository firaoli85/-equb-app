export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { NewCycleWizard } from "@/components/admin/NewCycleWizard";

export default async function NewCyclePage() {
  const currentMembers = await db.member.findMany({
    where: { isArchived: false },
    orderBy: { wheelNumber: "asc" },
    select: {
      nameAmharic:      true,
      nameEnglishFirst: true,
      nameEnglishLast:  true,
      phone:            true,
      weeklyAmount:     true,
      wheelNumber:      true,
      extraWheelNumber: true,
    },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Start New Cycle</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Permanently erases all current cycle data and seeds a fresh one. Follow the steps carefully.
        </p>
      </div>
      <NewCycleWizard currentMembers={currentMembers} />
    </div>
  );
}
