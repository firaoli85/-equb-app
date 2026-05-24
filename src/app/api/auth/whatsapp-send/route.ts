import { db } from "@/lib/db";
import twilio from "twilio";

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
  const { phone } = body ?? {};

  if (!phone || typeof phone !== "string") {
    return Response.json({ error: "phone required" }, { status: 400 });
  }

  const enteredLast10 = last10(phone);
  if (enteredLast10.length < 10) {
    return Response.json({ error: "Invalid phone number." }, { status: 400 });
  }

  const members = await db.member.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
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
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({
        to: `whatsapp:${toE164(member.phone!)}`,
        channel: "whatsapp",
      });
    return Response.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send code.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
