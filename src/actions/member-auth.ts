"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, deleteMemberSession, clearSessionCookies } from "@/lib/member-session";

export async function memberSignOut(): Promise<void> {
  const jar = await cookies();
  const sessionToken = jar.get(SESSION_COOKIE)?.value;
  if (sessionToken) await deleteMemberSession(sessionToken);
  await clearSessionCookies();
  redirect("/login");
}
