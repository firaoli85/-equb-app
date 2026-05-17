import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getDisplayName, getCurrentWeekNumber, TOTAL_WEEKS } from "@/lib/equb";
import { MemberDrawer } from "@/components/member/MemberDrawer";
import { MobileSignOut } from "@/components/member/MobileSignOut";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default async function MemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const member = await db.member.findUnique({ where: { token } });
  if (!member) notFound();

  if (!member.confirmedAt) {
    return <>{children}</>;
  }

  const displayName = getDisplayName(member);

  // Weeks within ±2 of the current week for the review request modal
  const currentWeek = getCurrentWeekNumber();
  const minWeek = Math.max(1, currentWeek - 2);
  const maxWeek = Math.min(TOTAL_WEEKS, currentWeek + 2);
  const rawWeeks = await db.week.findMany({
    where: { weekNumber: { gte: minWeek, lte: maxWeek } },
    orderBy: { weekNumber: "asc" },
    select: { id: true, weekNumber: true, date: true },
  });
  const eligibleWeeks = rawWeeks.map((w) => ({ ...w, date: w.date.toISOString() }));

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0a0a0b]">
      <div className="sticky top-0 z-10 bg-[#F7F8FA]/90 dark:bg-[#0a0a0b]/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800/60">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <MemberDrawer token={token} eligibleWeeks={eligibleWeeks} />
            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle />
              <span className="text-base font-bold text-gray-800 dark:text-gray-100 hidden sm:block">
                {displayName}
              </span>
              <MobileSignOut />
            </div>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
