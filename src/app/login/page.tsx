import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NEW_SESSION_COOKIE, validateNewMemberSession } from "@/lib/sessions";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;

  // If already authenticated, redirect directly to the member portal
  const jar = await cookies();
  const sid = jar.get(NEW_SESSION_COOKIE)?.value;
  if (sid) {
    const memberId = await validateNewMemberSession(sid);
    if (memberId) {
      const member = await db.member.findUnique({
        where: { id: memberId },
        select: { token: true },
      });
      if (member) redirect(`/m/${member.token}`);
    }
  }

  const showExpiredNotice = expired === "1";

  return (
    <div className="min-h-screen bg-[#eef3fa] dark:bg-[#0a0a0b] flex justify-center px-4 pt-12 pb-8">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white dark:bg-[#141414] border border-gray-100 dark:border-gray-800 shadow-sm px-6 py-8">

          {showExpiredNotice && (
            <div className="mb-5 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Your session expired. Please sign in again.
            </div>
          )}

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
