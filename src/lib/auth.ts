import { cookies } from "next/headers";
import { NEW_SESSION_COOKIE, validateNewAdminSession } from "@/lib/sessions";

// Kept only to clear the stale old cookie on logout; no longer used for validation.
export const SESSION_COOKIE = "equb_session";

export async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const cookieStore = await cookies();
  const sid = cookieStore.get(NEW_SESSION_COOKIE)?.value;
  if (sid && (await validateNewAdminSession(sid))) return { ok: true };
  return { ok: false, error: "Unauthorized" };
}
