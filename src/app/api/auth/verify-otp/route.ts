import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { computeFingerprint, createMemberSession, setSessionCookies } from "@/lib/member-session";

function digitsOnly(s: string) { return s.replace(/\D/g, ""); }
function last10(s: string) { return digitsOnly(s).slice(-10); }

async function findMemberByPhone(entered: string) {
  const enteredLast10 = last10(entered);
  if (enteredLast10.length < 10) return null;
  const members = await db.member.findMany({
    where: { phone: { not: null } },
    select: { id: true, token: true, phone: true },
  });
  return members.find((m) => last10(m.phone!) === enteredLast10) ?? null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, code, screen, language } = body as {
      phone?: string; code?: string; screen?: string; language?: string;
    };

    if (!phone || !code) {
      return NextResponse.json({ error: "Missing phone or code." }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Code must be exactly 6 digits." }, { status: 400 });
    }

    const e164 = `+1${last10(phone)}`;
    const sid        = process.env.TWILIO_VERIFY_SERVICE_SID!.trim();
    const accountSid = process.env.TWILIO_ACCOUNT_SID!.trim();
    const authToken  = process.env.TWILIO_AUTH_TOKEN!.trim();
    const basic = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const twRes = await fetch(`https://verify.twilio.com/v2/Services/${sid}/VerificationCheck`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({ To: e164, Code: code }).toString(),
    });

    const twBody = await twRes.text();
    console.log("[verify-otp] Twilio", twRes.status, twBody.slice(0, 200));

    if (twRes.status === 404) {
      return NextResponse.json({ error: "Code expired or already used. Request a new one." }, { status: 400 });
    }
    if (!twRes.ok) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    let parsed: { status?: string };
    try { parsed = JSON.parse(twBody); } catch { parsed = {}; }
    if (parsed.status !== "approved") {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    const member = await findMemberByPhone(phone);
    if (!member) {
      return NextResponse.json({ error: "Phone number not found." }, { status: 404 });
    }

    const ua = (await headers()).get("user-agent") ?? "";
    const fingerprint = await computeFingerprint(ua, screen ?? "", language ?? "");
    const { sessionToken, hadPreviousDevice } = await createMemberSession(member.id, fingerprint);
    await setSessionCookies(sessionToken, screen ?? "", language ?? "");

    return NextResponse.json({
      success: true,
      redirectTo: hadPreviousDevice
        ? `/m/${member.token}?notice=new_device`
        : `/m/${member.token}`,
    });
  } catch (err) {
    console.error("[verify-otp] error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
