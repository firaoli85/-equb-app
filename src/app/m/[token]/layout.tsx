import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  getSessionFromCookies,
  computeFingerprint,
  validateSession,
} from "@/lib/member-session";
import { getCurrentWeekNumber, TOTAL_WEEKS, EQUB_START } from "@/lib/equb";
import { MemberDrawer } from "@/components/member/MemberDrawer";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NameToggle } from "@/components/member/NameToggle";

export default async function MemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // 1. Require session cookie
  const sessionData = await getSessionFromCookies();
  if (!sessionData) redirect("/login");

  // 2. Validate session in DB (inactivity, expiry, device fingerprint)
  const ua = (await headers()).get("user-agent") ?? "";
  const fingerprint = await computeFingerprint(ua, sessionData.screen, sessionData.language);
  const sessionResult = await validateSession(sessionData.sessionToken, fingerprint);
  if (!sessionResult.valid) redirect("/login?expired=1");

  // 3. Find member by URL token
  const member = await db.member.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      isArchived: true,
      confirmedAt: true,
      nameAmharic: true,
      nameEnglishFirst: true,
      nameEnglishLast: true,
      displayPreference: true,
      wheelNumber: true,
    },
  });
  if (!member || member.isArchived) notFound();

  // 4. Prevent cross-member access
  if (sessionResult.memberId !== member.id) redirect("/login");

  if (!member.confirmedAt) {
    return <>{children}</>;
  }

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
          <div className="flex items-center gap-2 shrink-0">
            <NameToggle token={token} current={member.displayPreference} />
            <ThemeToggle />
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
