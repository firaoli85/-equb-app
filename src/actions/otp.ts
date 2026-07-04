"use server";

import { db } from "@/lib/db";
import { sendVerification, checkVerification } from "@/lib/twilio";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionForMember, setNewSessionCookie, memberSessionMaxAge } from "@/lib/sessions";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function last10(s: string): string {
  return digitsOnly(s).slice(-10);
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

// Called directly from LoginForm via useTransition — phone is already E.164
export async function sendOtp(
  phone: string,
  channel: "sms" | "whatsapp"
): Promise<{ error?: string; sent?: boolean }> {
  if (!phone) return { error: "Phone number missing." };

  try {
    await sendVerification(phone, channel);
    return { sent: true };
  } catch (err) {
    console.error("[sendOtp] Twilio error:", err);
    return {
      error: `Failed to send ${channel === "whatsapp" ? "WhatsApp" : "SMS"} code. Please try again.`,
    };
  }
}

export async function verifyOtp(
  phone: string,
  code: string,
  screen: string = "",
  language: string = ""
): Promise<{ error?: string; expired?: true }> {
  let redirectPath: string | null = null;

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

    // approved — find member and create session
    const member = await findMemberByPhone(phone);
    if (!member) return { error: "Phone number not found." };

    const ua = (await headers()).get("user-agent") ?? "";
    const newSid = await createSessionForMember(member.id, ua);
    await setNewSessionCookie(newSid, memberSessionMaxAge());

    redirectPath = `/m/${member.token}`;
  } catch (err) {
    console.error("[verifyOtp] unexpected error:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }

  if (redirectPath) redirect(redirectPath);
  return {};
}

// Legacy form-action wrapper (kept for compatibility)
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

  const e164 = `+1${last10(raw)}`;
  const channel = (formData.get("channel") as "sms" | "whatsapp") ?? "sms";

  try {
    await sendVerification(e164, channel);
  } catch (err) {
    console.error("[requestOtp] Twilio error:", err);
    return { error: "Failed to send code. Please try again." };
  }

  return { sent: true, phone: e164 };
}
