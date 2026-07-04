import { headers } from "next/headers";
import { db } from "@/lib/db";
import twilio from "twilio";
import { computeFingerprint, createMemberSession, setSessionCookies } from "@/lib/member-session";
import { createSessionForMember, setNewSessionCookie, memberSessionMaxAge } from "@/lib/sessions";

export const runtime = "nodejs";

function digitsOnly(s: string): string { return s.replace(/\D/g, ""); }
function last10(s: string): string { return digitsOnly(s).slice(-10); }
function toE164(phone: string): string {
  const d = digitsOnly(phone);
  if (phone.trim().startsWith("+")) return "+" + d;
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  return "+" + d;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { phone, code, screen, language } = body ?? {};

  if (!phone || typeof phone !== "string" || !code || typeof code !== "string") {
    return Response.json({ error: "phone and code required" }, { status: 400 });
  }

  const enteredLast10 = last10(phone);
  if (enteredLast10.length < 10) {
    return Response.json({ error: "Invalid phone number." }, { status: 400 });
  }

  const members = await db.member.findMany({
    where: { phone: { not: null } },
    select: { id: true, token: true, phone: true },
  });

  const member = members.find((m) => last10(m.phone!) === enteredLast10) ?? null;
  if (!member) {
    return Response.json({ error: "Phone number not found." }, { status: 404 });
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );

  try {
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({
        to: toE164(member.phone!),
        code,
      });

    if (check.status !== "approved") {
      return Response.json({ error: "Invalid code." }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Invalid code." }, { status: 400 });
  }

  const ua = (await headers()).get("user-agent") ?? "";
  const fingerprint = await computeFingerprint(ua, screen ?? "", language ?? "");
  const { sessionToken, hadPreviousDevice } = await createMemberSession(member.id, fingerprint);
  await setSessionCookies(sessionToken, screen ?? "", language ?? "");
  const newSid = await createSessionForMember(member.id, ua);
  await setNewSessionCookie(newSid, memberSessionMaxAge());

  const redirectTo = hadPreviousDevice
    ? `/m/${member.token}?notice=new_device`
    : `/m/${member.token}`;

  return Response.json({ success: true, redirectTo });
}
