"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
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
  if (!password) return { error: "Incorrect password" };

  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (passwordHash) {
    // Bcrypt comparison — set ADMIN_PASSWORD_HASH in env to activate this path.
    const correct = await bcrypt.compare(password, passwordHash);
    if (!correct) return { error: "Incorrect password" };
  } else {
    // Plaintext fallback — works until ADMIN_PASSWORD_HASH is configured.
    if (password !== process.env.ADMIN_PASSWORD) return { error: "Incorrect password" };
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
