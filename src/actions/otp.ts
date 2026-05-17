// SMS OTP disabled pending A2P Campaign approval — re-enable when approved.
// PIN-based login is active instead (see src/actions/pin-login.ts).
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
  phone: string,
  code: string
): Promise<{ error?: string; expired?: true }> {
  console.log("[verifyOtp] invoked — phone:", JSON.stringify(phone), "code:", JSON.stringify(code));

  let redirectToken: string | null = null;

  try {
    if (!phone) return { error: "Session error: phone missing. Please go back and re-enter your number." };
    if (!code)  return { error: "Please enter the 6-digit code." };
    if (!/^\d{6}$/.test(code)) return { error: "Code must be exactly 6 digits." };

    const result = await checkVerification(phone, code);
    console.log("[verifyOtp] Twilio result:", result);

    if (result === "expired") {
      return { error: "This code has expired or was already used. Request a new one.", expired: true };
    }
    if (result === "invalid") {
      return { error: "Incorrect code. Please check and try again." };
    }

    // result === "approved"
    const member = await findMemberByPhone(phone);
    if (!member) {
      console.log("[verifyOtp] member not found for phone:", phone);
      return { error: "Phone number not found." };
    }

    await setMemberSessionCookie(member.token);
    redirectToken = member.token;
    console.log("[verifyOtp] success — redirecting member:", member.id);
  } catch (err) {
    console.error("[verifyOtp] unexpected error:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }

  // redirect() throws NEXT_REDIRECT internally — must be outside try/catch
  if (redirectToken) redirect(`/m/${redirectToken}`);
  return {};
}
