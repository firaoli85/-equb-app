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

  // Already have a valid session — bounce to their portal
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
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0a0a0b] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-3xl mb-4 border border-emerald-200 dark:border-emerald-800">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Equb Member Login</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your phone number to continue</p>
        </div>

        {showNewDeviceNotice && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
            You were signed out because you signed in on a different device.
          </div>
        )}

        {showExpiredNotice && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
            Your session expired. Please sign in again.
          </div>
        )}

        <LoginForm />
      </div>
    </div>
  );
}
