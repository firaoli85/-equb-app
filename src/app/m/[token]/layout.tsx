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
import { MemberSidebar } from "@/components/member/MemberSidebar";
import { MemberTabBar } from "@/components/member/MemberTabBar";
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
        Fixed header — 64px (h-16), z-50.
        Mobile: hamburger on left + toggles on right.
        Desktop: hamburger hidden (sidebar handles nav), toggles indented past sidebar.
      */}
      <header
        className="h-16 bg-[#F7F8FA]/95 dark:bg-[#0a0a0b]/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800/60"
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50 }}
      >
        <div className="h-full px-4 md:pl-64 flex items-center gap-2">
          {/* Hamburger — mobile only; sidebar handles desktop nav */}
          <div className="md:hidden">
            <MemberDrawer token={token} eligibleWeeks={eligibleWeeks} />
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <NameToggle token={token} current={member.displayPreference} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Desktop sidebar — fixed left, starts below the header */}
      <MemberSidebar token={token} eligibleWeeks={eligibleWeeks} />

      {/*
        pt-16  = clears fixed header (both breakpoints)
        pb-24  = clears mobile bottom tab bar (56px bar + safe-area headroom)
        md:pb-0= no bottom tab bar on desktop
        md:pl-60= offset past the 240px sidebar on desktop
      */}
      <main className="pt-16 pb-24 md:pb-0 md:pl-60">
        {children}
      </main>

      {/* Mobile-only bottom tab bar — md:hidden inside the component */}
      <MemberTabBar token={token} />
    </div>
  );
}
