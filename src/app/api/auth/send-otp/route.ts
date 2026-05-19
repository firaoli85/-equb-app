import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function digitsOnly(s: string) { return s.replace(/\D/g, ""); }
function last10(s: string) { return digitsOnly(s).slice(-10); }

async function findMemberByPhone(entered: string) {
  const enteredLast10 = last10(entered);
  if (enteredLast10.length < 10) return null;
  const members = await db.member.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  });
  return members.find((m) => last10(m.phone!) === enteredLast10) ?? null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, channel } = body as { phone?: string; channel?: string };

    if (!phone || !channel) {
      return NextResponse.json({ error: "Missing phone or channel." }, { status: 400 });
    }
    if (channel !== "whatsapp" && channel !== "sms") {
      return NextResponse.json({ error: "Invalid channel." }, { status: 400 });
    }

    const member = await findMemberByPhone(phone);
    if (!member) {
      return NextResponse.json({ error: "Phone number not registered. Please contact your Equb manager." }, { status: 404 });
    }

    const e164 = `+1${last10(phone)}`;
    const sid       = process.env.TWILIO_VERIFY_SERVICE_SID!.trim();
    const accountSid = process.env.TWILIO_ACCOUNT_SID!.trim();
    const authToken  = process.env.TWILIO_AUTH_TOKEN!.trim();
    const basic = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const twRes = await fetch(`https://verify.twilio.com/v2/Services/${sid}/Verifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({ To: e164, Channel: channel }).toString(),
    });

    const twBody = await twRes.text();
    console.log("[send-otp] Twilio", twRes.status, twBody.slice(0, 200));

    if (!twRes.ok) {
      return NextResponse.json({ error: "Failed to send code. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-otp] error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
