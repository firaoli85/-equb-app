import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getDisplayName, getCurrentWeekNumber, TOTAL_WEEKS, EQUB_START } from "@/lib/equb";
import { MemberDrawer } from "@/components/member/MemberDrawer";
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

  const allWeeks = await db.week.findMany({
    orderBy: { weekNumber: "asc" },
    select: { id: true, weekNumber: true, date: true },
  });
  const week1Date = allWeeks.find((w) => w.weekNumber === 1)?.date ?? EQUB_START;
  const currentWeek = getCurrentWeekNumber(week1Date);
  const minWeek = Math.max(1, currentWeek - 2);
  const maxWeek = Math.min(TOTAL_WEEKS, currentWeek + 2);
  const eligibleWeeks = allWeeks
    .filter((w) => w.weekNumber >= minWeek && w.weekNumber <= maxWeek)
    .map((w) => ({ ...w, date: w.date.toISOString() }));

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0a0a0b]">
      {/*
        Fixed header — exactly 64px tall (h-16), z-50 on top of all content.
        No Sign Out here. Sign Out lives only inside the hamburger drawer.
      */}
      <header
        className="h-16 bg-[#F7F8FA]/95 dark:bg-[#0a0a0b]/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800/60"
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50 }}
      >
        <div className="h-full max-w-5xl mx-auto px-4 flex items-center justify-between gap-2">
          <MemberDrawer token={token} eligibleWeeks={eligibleWeeks} />
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <span className="text-base font-bold text-gray-800 dark:text-gray-100 hidden sm:block">
              {displayName}
            </span>
          </div>
        </div>
      </header>

      {/* pt-16 = 64px, exactly the fixed header height — content starts below the header */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
