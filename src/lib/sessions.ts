import { db } from "@/lib/db";
import { cookies } from "next/headers";

export const NEW_SESSION_COOKIE = "equb_sid";

const MEMBER_MAX_AGE_SECS = 30 * 24 * 60 * 60;  // 30 days
const ADMIN_MAX_AGE_SECS  = 8  * 60 * 60;        // 8 hours

export function memberSessionMaxAge(): number { return MEMBER_MAX_AGE_SECS; }
export function adminSessionMaxAge():  number { return ADMIN_MAX_AGE_SECS;  }

export async function createSessionForMember(memberId: string, ua?: string): Promise<string> {
  const expiresAt = new Date(Date.now() + MEMBER_MAX_AGE_SECS * 1000);
  const row = await db.session.create({
    data: { memberId, isAdmin: false, expiresAt, userAgent: ua?.slice(0, 500) ?? null },
    select: { id: true },
  });
  return row.id;
}

export async function createSessionForAdmin(ua?: string): Promise<string> {
  const expiresAt = new Date(Date.now() + ADMIN_MAX_AGE_SECS * 1000);
  const row = await db.session.create({
    data: { memberId: null, isAdmin: true, expiresAt, userAgent: ua?.slice(0, 500) ?? null },
    select: { id: true },
  });
  return row.id;
}

export async function validateNewMemberSession(sid: string): Promise<string | null> {
  const row = await db.session.findUnique({ where: { id: sid } });
  if (!row || row.isAdmin || !row.memberId) return null;
  if (new Date() >= row.expiresAt) {
    await db.session.delete({ where: { id: sid } }).catch(() => {});
    return null;
  }
  db.session.update({ where: { id: sid }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return row.memberId;
}

export async function validateNewAdminSession(sid: string): Promise<boolean> {
  const row = await db.session.findUnique({ where: { id: sid } });
  if (!row || !row.isAdmin) return false;
  if (new Date() >= row.expiresAt) {
    await db.session.delete({ where: { id: sid } }).catch(() => {});
    return false;
  }
  db.session.update({ where: { id: sid }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return true;
}

export async function destroySession(sid: string): Promise<void> {
  await db.session.deleteMany({ where: { id: sid } }).catch(() => {});
}

export async function setNewSessionCookie(sid: string, maxAge: number): Promise<void> {
  const jar = await cookies();
  jar.set(NEW_SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  });
}

export async function clearNewSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(NEW_SESSION_COOKIE);
}
