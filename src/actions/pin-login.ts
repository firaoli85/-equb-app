"use server";

import { db } from "@/lib/db";
import { verifyPin } from "@/lib/pin";
import { setMemberSessionCookie } from "@/lib/member-session";
import { redirect } from "next/navigation";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 30;

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}
function last10(s: string): string {
  return digitsOnly(s).slice(-10);
}
function toE164(phone: string): string {
  return `+1${last10(phone)}`;
}
function friendlyPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").slice(-10);
  if (d.length !== 10) return e164;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

async function findMemberByPhone(entered: string) {
  const enteredLast10 = last10(entered);
  if (enteredLast10.length < 10) return null;

  const members = await db.member.findMany({
    where: { phone: { not: null } },
    select: {
      id: true, token: true, phone: true,
      pin: true, pinAttempts: true, pinLockedUntil: true,
    },
  });

  return members.find((m) => last10(m.phone!) === enteredLast10) ?? null;
}

export async function lookupPhone(
  _prev: { error?: string; found?: boolean },
  formData: FormData
): Promise<{
  error?: string;
  found?: boolean;
  phone?: string;
  hasPin?: boolean;
  displayPhone?: string;
}> {
  const raw = (formData.get("phone") as string)?.trim();
  if (!raw) return { error: "Please enter your phone number." };

  const member = await findMemberByPhone(raw);
  if (!member) {
    return { error: "Phone number not registered. Please contact your Equb manager." };
  }

  const e164 = toE164(raw);
  return {
    found: true,
    phone: e164,
    hasPin: !!member.pin,
    displayPhone: friendlyPhone(e164),
  };
}

export async function verifyMemberPin(
  phone: string,
  pin: string
): Promise<{
  error?: string;
  noPin?: boolean;
  attemptsLeft?: number;
  locked?: boolean;
  lockedMinutes?: number;
}> {
  let redirectToken: string | null = null;

  try {
    if (!phone || !pin) return { error: "Invalid request." };
    if (!/^\d{4}$/.test(pin)) return { error: "PIN must be exactly 4 digits." };

    const member = await findMemberByPhone(phone);
    if (!member) return { error: "Phone number not found." };

    // Locked?
    if (member.pinLockedUntil && new Date() < member.pinLockedUntil) {
      const mins = Math.ceil((member.pinLockedUntil.getTime() - Date.now()) / 60_000);
      return { locked: true, lockedMinutes: mins };
    }

    // No PIN set
    if (!member.pin) {
      return { noPin: true };
    }

    const correct = await verifyPin(pin, member.pin);

    if (!correct) {
      const newAttempts = member.pinAttempts + 1;
      const shouldLock = newAttempts >= MAX_ATTEMPTS;
      await db.member.update({
        where: { id: member.id },
        data: {
          pinAttempts: newAttempts,
          ...(shouldLock
            ? { pinLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
            : {}),
        },
      });
      if (shouldLock) return { locked: true, lockedMinutes: LOCK_MINUTES };
      return {
        error: "Incorrect PIN. Please try again.",
        attemptsLeft: MAX_ATTEMPTS - newAttempts,
      };
    }

    // Correct — clear lock state and log in
    await db.member.update({
      where: { id: member.id },
      data: { pinAttempts: 0, pinLockedUntil: null },
    });
    await setMemberSessionCookie(member.token);
    redirectToken = member.token;
  } catch (err) {
    console.error("[verifyMemberPin] error:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }

  // redirect() throws NEXT_REDIRECT — must be outside try/catch
  if (redirectToken) redirect(`/m/${redirectToken}`);
  return {};
}
