"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clearSessionCookies } from "@/lib/member-session";
import { NEW_SESSION_COOKIE, destroySession, clearNewSessionCookie } from "@/lib/sessions";

export async function memberSignOut(): Promise<void> {
  const jar = await cookies();

  const newSid = jar.get(NEW_SESSION_COOKIE)?.value;
  if (newSid) await destroySession(newSid);
  await clearNewSessionCookie();
  await clearSessionCookies(); // wipe any stale equb_member_session / equb_device_hint

  redirect("/login");
}
