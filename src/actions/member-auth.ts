"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, deleteMemberSession, clearSessionCookies } from "@/lib/member-session";
import { NEW_SESSION_COOKIE, destroySession, clearNewSessionCookie } from "@/lib/sessions";

export async function memberSignOut(): Promise<void> {
  const jar = await cookies();

  // Delete new session row
  const newSid = jar.get(NEW_SESSION_COOKIE)?.value;
  if (newSid) await destroySession(newSid);
  await clearNewSessionCookie();

  // Delete old session row
  const sessionToken = jar.get(SESSION_COOKIE)?.value;
  if (sessionToken) await deleteMemberSession(sessionToken);
  await clearSessionCookies();

  redirect("/login");
}
