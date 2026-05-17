"use server";

import { db } from "@/lib/db";
import { sendVerification, checkVerification } from "@/lib/twilio";
import { setMemberSessionCookie } from "@/lib/member-session";
import { redirect } from "next/navigation";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

// Last 10 digits — the locally significant part of a US number
function last10(s: string): string {
  return digitsOnly(s).slice(-10);
}

// Canonical E.164 for US numbers: +1 + last 10 digits
function toE164(phone: string): string {
  return `+1${last10(phone)}`;
}

// Find a member whose stored phone matches the entered phone by digit comparison
async function findMemberByPhone(entered: string) {
  const enteredLast10 = last10(entered);
  if (enteredLast10.length < 10) return null;

  const members = await db.member.findMany({
    where: { phone: { not: null } },
    select: { id: true, token: true, phone: true },
  });

  return members.find((m) => last10(m.phone!) === enteredLast10) ?? null;
}

export async function requestOtp(
  _prev: { error?: string; sent?: boolean },
  formData: FormData
): Promise<{ error?: string; sent?: boolean; phone?: string }> {
  const raw = (formData.get("phone") as string)?.trim();
  if (!raw) return { error: "Please enter your phone number." };

  const member = await findMemberByPhone(raw);
  if (!member) {
    return { error: "Phone number not registered. Please contact your Equb manager." };
  }

  const e164 = toE164(raw);
  console.log("[requestOtp] sending verification to:", e164);

  try {
    await sendVerification(e164);
  } catch (err) {
    console.error("Twilio Verify error:", err);
    return { error: "Failed to send SMS. Please try again." };
  }

  // Return the E.164 number so verifyOtp uses the exact same To= value
  return { sent: true, phone: e164 };
}

export async function verifyOtp(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const phone = (formData.get("phone") as string)?.trim();
  const code = (formData.get("code") as string)?.trim();

  if (!phone || !code) return { error: "Phone and code are required." };

  console.log("[verifyOtp] checking verification for:", phone, "code:", code);
  const approved = await checkVerification(phone, code);
  console.log("[verifyOtp] Twilio result:", approved ? "approved" : "not approved");
  if (!approved) {
    return { error: "Invalid or expired code. Please request a new one." };
  }

  const member = await findMemberByPhone(phone);
  if (!member) return { error: "Phone number not found." };

  await setMemberSessionCookie(member.token);
  redirect(`/m/${member.token}`);
}
