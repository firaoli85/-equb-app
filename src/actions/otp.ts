"use server";

import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";
import { setMemberSessionCookie } from "@/lib/member-session";
import { redirect } from "next/navigation";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateCode(): string {
  // Cryptographically random 6-digit code (padded so it's always 6 digits)
  return String(Math.floor(100000 + Math.random() * 900000));
}

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
    select: { id: true, token: true, phone: true, otpCode: true, otpExpiresAt: true },
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
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.member.update({
    where: { id: member.id },
    data: { otpCode: code, otpExpiresAt: expiresAt },
  });

  console.log("[requestOtp] OTP generated for:", e164, "expires:", expiresAt.toISOString());

  try {
    await sendSms(e164, `Your Equb login code is: ${code}. It expires in 10 minutes.`);
  } catch (err) {
    console.error("[requestOtp] SMS send error:", err);
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

    const member = await findMemberByPhone(phone);
    if (!member) {
      console.log("[verifyOtp] no member found for phone:", phone);
      return { error: "Phone number not found." };
    }

    console.log("[verifyOtp] member found:", member.id, "stored code:", member.otpCode ?? "null", "expires:", member.otpExpiresAt?.toISOString() ?? "null");

    if (!member.otpCode || !member.otpExpiresAt) {
      return { error: "No code was sent to this number. Please request a new one.", expired: true };
    }

    if (new Date() > member.otpExpiresAt) {
      await db.member.update({
        where: { id: member.id },
        data: { otpCode: null, otpExpiresAt: null },
      });
      console.log("[verifyOtp] code expired at:", member.otpExpiresAt.toISOString());
      return { error: "This code has expired. Please request a new one.", expired: true };
    }

    if (member.otpCode !== code) {
      console.log("[verifyOtp] wrong code — stored:", member.otpCode, "entered:", code);
      return { error: "Incorrect code. Please check and try again." };
    }

    // Correct — clear code immediately so it cannot be reused
    await db.member.update({
      where: { id: member.id },
      data: { otpCode: null, otpExpiresAt: null },
    });

    await setMemberSessionCookie(member.token);
    redirectToken = member.token;
    console.log("[verifyOtp] success — redirecting to /m/" + redirectToken);
  } catch (err) {
    console.error("[verifyOtp] unexpected error:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }

  // redirect() throws NEXT_REDIRECT internally — must be outside try/catch
  if (redirectToken) redirect(`/m/${redirectToken}`);
  return {};
}
