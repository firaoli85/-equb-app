import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  getSessionFromCookies,
  computeFingerprint,
  validateSession,
} from "@/lib/member-session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; expired?: string }>;
}) {
  const { notice, expired } = await searchParams;

  const sessionData = await getSessionFromCookies();
  if (sessionData) {
    const ua = (await headers()).get("user-agent") ?? "";
    const fingerprint = await computeFingerprint(ua, sessionData.screen, sessionData.language);
    const sessionResult = await validateSession(sessionData.sessionToken, fingerprint);
    if (sessionResult.valid) {
      const member = await db.member.findUnique({
        where: { id: sessionResult.memberId },
        select: { token: true },
      });
      if (member) redirect(`/m/${member.token}`);
    }
  }

  const showNewDeviceNotice = notice === "new_device";
  const showExpiredNotice   = expired === "1";

  return (
    <div className="min-h-screen bg-[#eef3fa] dark:bg-[#0a0a0b] flex justify-center px-4 pt-12 pb-8">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white dark:bg-[#141414] border border-gray-100 dark:border-gray-800 shadow-sm px-6 py-8">

          {showNewDeviceNotice && (
            <div className="mb-5 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Signed out — you signed in on a new device.
            </div>
          )}

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
