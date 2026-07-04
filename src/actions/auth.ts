"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
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

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 60,
    path: "/",
  });

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
  cookieStore.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
