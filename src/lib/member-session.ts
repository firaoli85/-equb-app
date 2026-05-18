import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "equb_member_session";
export const DEVICE_COOKIE = "equb_device_hint";

const INACTIVITY_MS = 2 * 60 * 60 * 1000;  // 2 hours
const MAX_AGE_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days absolute max

export async function computeFingerprint(ua: string, screen: string, language: string): Promise<string> {
  const data = `${ua}|${screen}|${language}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createMemberSession(
  memberId: string,
  fingerprint: string
): Promise<{ sessionToken: string; hadPreviousDevice: boolean }> {
  const existing = await db.memberSession.findFirst({ where: { memberId } });

  let hadPreviousDevice = false;
  if (existing) {
    if (existing.deviceFingerprint !== fingerprint) hadPreviousDevice = true;
    await db.memberSession.deleteMany({ where: { memberId } });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + MAX_AGE_MS);

  const session = await db.memberSession.create({
    data: { memberId, deviceFingerprint: fingerprint, lastActiveAt: now, expiresAt },
  });

  return { sessionToken: session.sessionToken, hadPreviousDevice };
}

export async function validateSession(
  sessionToken: string,
  fingerprint: string
): Promise<{ valid: true; memberId: string } | { valid: false }> {
  const session = await db.memberSession.findUnique({ where: { sessionToken } });
  if (!session) return { valid: false };

  const now = new Date();

  if (now.getTime() - session.lastActiveAt.getTime() > INACTIVITY_MS) {
    await db.memberSession.delete({ where: { sessionToken } }).catch(() => {});
    return { valid: false };
  }

  if (now > session.expiresAt) {
    await db.memberSession.delete({ where: { sessionToken } }).catch(() => {});
    return { valid: false };
  }

  if (session.deviceFingerprint !== fingerprint) {
    await db.memberSession.delete({ where: { sessionToken } }).catch(() => {});
    return { valid: false };
  }

  await db.memberSession.update({
    where: { sessionToken },
    data: { lastActiveAt: now },
  }).catch(() => {});

  return { valid: true, memberId: session.memberId };
}

export async function deleteMemberSession(sessionToken: string): Promise<void> {
  await db.memberSession.deleteMany({ where: { sessionToken } }).catch(() => {});
}

export async function setSessionCookies(sessionToken: string, screen: string, language: string): Promise<void> {
  const jar = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  const opts = { httpOnly: true, secure: isProd, sameSite: "lax" as const, path: "/" };

  jar.set(SESSION_COOKIE, sessionToken, { ...opts, maxAge: 7 * 24 * 60 * 60 });
  jar.set(DEVICE_COOKIE, `${screen}|${language}`, { ...opts, maxAge: 7 * 24 * 60 * 60 });
}

export async function clearSessionCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(DEVICE_COOKIE);
}

export async function getSessionFromCookies(): Promise<{
  sessionToken: string;
  screen: string;
  language: string;
} | null> {
  const jar = await cookies();
  const sessionToken = jar.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  const deviceHint = jar.get(DEVICE_COOKIE)?.value ?? "|";
  const pipeIdx = deviceHint.indexOf("|");
  const screen   = pipeIdx !== -1 ? deviceHint.slice(0, pipeIdx) : "";
  const language = pipeIdx !== -1 ? deviceHint.slice(pipeIdx + 1) : "";

  return { sessionToken, screen, language };
}
