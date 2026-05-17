"use server";

import { db } from "@/lib/db";
import { sendVerification, checkVerification } from "@/lib/twilio";
import { setMemberSessionCookie } from "@/lib/member-session";
import { redirect } from "next/navigation";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function last10(s: string): string {
  return digitsOnly(s).slice(-10);
}

function toE164(phone: string): string {
  return `+1${last10(phone)}`;
}

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
    console.error("[requestOtp] Twilio Verify error:", err);
    return { error: "Failed to send SMS. Please try again." };
  }

  return { sent: true, phone: e164 };
}

export async function verifyOtp(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  // Log first — before any guard — so we can see if the action is invoked at all
  console.log("[verifyOtp] action invoked");

  let redirectToken: string | null = null;

  try {
    const phone = (formData.get("phone") as string | null)?.trim() ?? "";
    const code  = (formData.get("code")  as string | null)?.trim() ?? "";

    console.log("[verifyOtp] phone:", JSON.stringify(phone));
    console.log("[verifyOtp] code: ", JSON.stringify(code));

    if (!phone) {
      console.log("[verifyOtp] FAIL — phone is empty");
      return { error: "Session error: phone not found. Please go back and re-enter your number." };
    }
    if (!code) {
      console.log("[verifyOtp] FAIL — code is empty");
      return { error: "Please enter the 6-digit code." };
    }
    if (!/^\d{6}$/.test(code)) {
      console.log("[verifyOtp] FAIL — code is not 6 digits, got:", JSON.stringify(code));
      return { error: "The code must be exactly 6 digits." };
    }

    console.log("[verifyOtp] calling Twilio checkVerification");
    const approved = await checkVerification(phone, code);
    console.log("[verifyOtp] Twilio result:", approved ? "APPROVED" : "NOT APPROVED");

    if (!approved) {
      return { error: "Invalid or expired code. Please request a new one." };
    }

    const member = await findMemberByPhone(phone);
    if (!member) {
      console.log("[verifyOtp] FAIL — member not found for phone:", phone);
      return { error: "Phone number not found." };
    }

    await setMemberSessionCookie(member.token);
    redirectToken = member.token;
  } catch (err) {
    console.error("[verifyOtp] unexpected error:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }

  // redirect() must be called outside try/catch — it throws NEXT_REDIRECT internally
  if (redirectToken) redirect(`/m/${redirectToken}`);
  return {};
}
