"use server";

import { db } from "@/lib/db";
import { sendVerification, checkVerification } from "@/lib/twilio";
import { setMemberSessionCookie } from "@/lib/member-session";
import { redirect } from "next/navigation";

function normalisePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

export async function requestOtp(
  _prev: { error?: string; sent?: boolean },
  formData: FormData
): Promise<{ error?: string; sent?: boolean; phone?: string }> {
  const rawPhone = (formData.get("phone") as string)?.trim();
  if (!rawPhone) return { error: "Please enter your phone number." };

  const phone = normalisePhone(rawPhone);

  const member = await db.member.findFirst({ where: { phone }, select: { id: true } });
  if (!member) {
    return { error: "Phone number not registered. Please contact your Equb manager." };
  }

  try {
    await sendVerification(phone);
  } catch (err) {
    console.error("Twilio Verify error:", err);
    return { error: "Failed to send SMS. Please try again." };
  }

  return { sent: true, phone };
}

export async function verifyOtp(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const phone = normalisePhone((formData.get("phone") as string)?.trim() ?? "");
  const code = (formData.get("code") as string)?.trim();

  if (!phone || !code) return { error: "Phone and code are required." };

  const approved = await checkVerification(phone, code);
  if (!approved) {
    return { error: "Invalid or expired code. Please request a new one." };
  }

  const member = await db.member.findFirst({ where: { phone }, select: { token: true } });
  if (!member) return { error: "Phone number not found." };

  await setMemberSessionCookie(member.token);
  redirect(`/m/${member.token}`);
}
