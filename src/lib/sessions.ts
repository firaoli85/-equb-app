import { db } from "@/lib/db";
import { cookies } from "next/headers";

export const NEW_SESSION_COOKIE = "equb_sid";

// ── Duration constants ────────────────────────────────────────────────────────
// All four are exported so callers can display them in UI if needed.
export const MEMBER_IDLE_MS = 2  * 60 * 60 * 1000;       // 2 hours  — member idle timeout
export const MEMBER_MAX_MS  = 30 * 24 * 60 * 60 * 1000;  // 30 days  — member absolute cap
export const ADMIN_IDLE_MS  = 15 * 60 * 1000;             // 15 min   — admin idle timeout
export const ADMIN_MAX_MS   = 8  * 60 * 60 * 1000;        // 8 hours  — admin absolute cap

// Seconds variants derived from the above (used for cookie maxAge + expiresAt at creation)
const MEMBER_MAX_AGE_SECS = MEMBER_MAX_MS / 1000;
const ADMIN_MAX_AGE_SECS  = ADMIN_MAX_MS  / 1000;

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

  const now = new Date();

  // 1. Absolute cap — expiresAt is set to createdAt + 30 days at creation
  if (now >= row.expiresAt) {
    await db.session.delete({ where: { id: sid } }).catch(() => {});
    return null;
  }

  // 2. Idle timeout — reject if no activity for > 2 hours
  if (now.getTime() - row.lastUsedAt.getTime() > MEMBER_IDLE_MS) {
    await db.session.delete({ where: { id: sid } }).catch(() => {});
    return null;
  }

  // Valid — slide lastUsedAt forward (fire-and-forget; never extends past expiresAt)
  db.session.update({ where: { id: sid }, data: { lastUsedAt: now } }).catch(() => {});
  return row.memberId;
}

export async function validateNewAdminSession(sid: string): Promise<boolean> {
  const row = await db.session.findUnique({ where: { id: sid } });
  if (!row || !row.isAdmin) return false;

  const now = new Date();

  // 1. Absolute cap — expiresAt is set to createdAt + 8 hours at creation
  if (now >= row.expiresAt) {
    await db.session.delete({ where: { id: sid } }).catch(() => {});
    return false;
  }

  // 2. Idle timeout — reject if no activity for > 15 minutes
  if (now.getTime() - row.lastUsedAt.getTime() > ADMIN_IDLE_MS) {
    await db.session.delete({ where: { id: sid } }).catch(() => {});
    return false;
  }

  // Valid — slide lastUsedAt forward (fire-and-forget; never extends past expiresAt)
  db.session.update({ where: { id: sid }, data: { lastUsedAt: now } }).catch(() => {});
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
