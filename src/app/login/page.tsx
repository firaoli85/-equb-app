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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex justify-center pt-16 px-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <p className="text-2xl font-black text-white tracking-tight">Equb</p>
          <p className="text-xs text-gray-500 tracking-widest uppercase mt-1">Members only</p>
        </div>

        {showNewDeviceNotice && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-950/40 border border-amber-800 text-sm text-amber-400">
            Signed out — you signed in on a new device.
          </div>
        )}

        {showExpiredNotice && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-400">
            Your session expired. Please sign in again.
          </div>
        )}

        <LoginForm />
      </div>
    </div>
  );
}
