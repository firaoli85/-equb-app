"use server";

import { db } from "@/lib/db";
import { hashPin } from "@/lib/pin";
import { computeFingerprint, createMemberSession, setSessionCookies } from "@/lib/member-session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Set a PIN for a member who has no PIN yet (pin === null after cycle reset).
 * Identity is proved by the member's token URL — resolved server-side; no client ID.
 *
 * Guard: refuses if member.pin is already set (cannot hijack an existing PIN).
 * On success: hashes pin, resets attempt counters, creates session, redirects to member home.
 * redirect() has return type `never` so TypeScript knows all non-error paths diverge here.
 */
export async function setInitialPin(
  token: string,
  newPin: string,
  confirmPin: string,
  screen: string,
  language: string,
): Promise<{ error: string }> {
  if (!/^\d{4}$/.test(newPin))  return { error: "PIN must be exactly 4 digits." };
  if (newPin !== confirmPin)     return { error: "PINs do not match. Please try again." };

  const member = await db.member.findUnique({
    where: { token },
    select: { id: true, token: true, pin: true, isArchived: true },
  });

  if (!member || member.isArchived) return { error: "Member not found." };

  // Core guard — only callable when pin is null
  if (member.pin !== null) return { error: "A PIN is already set for this account. Use the login page." };

  const hash = await hashPin(newPin);

  await db.member.update({
    where: { id: member.id },
    data: {
      pin:            hash,
      pinAttempts:    0,
      pinLockedUntil: null,
    },
  });

  const ua = (await headers()).get("user-agent") ?? "";
  const fingerprint = await computeFingerprint(ua, screen, language);
  const { sessionToken } = await createMemberSession(member.id, fingerprint);
  await setSessionCookies(sessionToken, screen, language);

  redirect(`/m/${member.token}`);
}
