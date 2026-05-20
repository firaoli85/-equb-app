import { headers } from "next/headers";
import { db } from "@/lib/db";
import { computeFingerprint, createMemberSession, setSessionCookies } from "@/lib/member-session";

export const runtime = "nodejs";

function digitsOnly(s: string): string { return s.replace(/\D/g, ""); }
function last10(s: string): string { return digitsOnly(s).slice(-10); }

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { phone, screen, language } = body ?? {};

  if (!phone || typeof phone !== "string") {
    return Response.json({ error: "phone required" }, { status: 400 });
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
    return Response.json({ error: "Phone number not registered." }, { status: 404 });
  }

  const ua = (await headers()).get("user-agent") ?? "";
  const fingerprint = await computeFingerprint(ua, screen ?? "", language ?? "");
  const { sessionToken, hadPreviousDevice } = await createMemberSession(member.id, fingerprint);
  await setSessionCookies(sessionToken, screen ?? "", language ?? "");

  const redirectTo = hadPreviousDevice
    ? `/m/${member.token}?notice=new_device`
    : `/m/${member.token}`;

  return Response.json({ success: true, redirectTo });
}
