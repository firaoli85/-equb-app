"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";
import {
  NEW_SESSION_COOKIE,
  createSessionForAdmin,
  setNewSessionCookie,
  adminSessionMaxAge,
  destroySession,
  clearNewSessionCookie,
} from "@/lib/sessions";

export async function login(
  prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const password = formData.get("password") as string;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return { error: "Incorrect password" };
  }

  const ua = (await headers()).get("user-agent") ?? "";
  const adminSid = await createSessionForAdmin(ua);
  await setNewSessionCookie(adminSid, adminSessionMaxAge());

  redirect("/admin");
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const newSid = cookieStore.get(NEW_SESSION_COOKIE)?.value;
  if (newSid) await destroySession(newSid);
  await clearNewSessionCookie();
  cookieStore.delete(SESSION_COOKIE); // wipe any stale old equb_session cookie
  redirect("/admin/login");
}
