import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getDisplayName } from "@/lib/equb";
import { MemberNav } from "@/components/member/MemberNav";

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

  // Agreement not yet signed — let the profile page show the agreement form fullscreen
  if (!member.confirmedAt) {
    return <>{children}</>;
  }

  const displayName = getDisplayName(member);

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0a0a0b]">
      {/* Sticky nav bar */}
      <div className="sticky top-0 z-10 bg-[#F7F8FA]/90 dark:bg-[#0a0a0b]/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800/60">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <MemberNav token={token} />
            <span className="shrink-0 text-base font-bold text-gray-800 dark:text-gray-100 hidden sm:block">
              {displayName}
            </span>
          </div>
        </div>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
