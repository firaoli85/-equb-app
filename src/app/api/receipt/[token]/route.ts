import { db } from "@/lib/db";
import { buildParticipationAgreementPDF } from "@/lib/pdf";
import type { DeviceFingerprint } from "@/lib/fingerprint";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const member = await db.member.findUnique({ where: { token } });

  if (!member) return new Response("Not found", { status: 404 });
  if (!member.confirmedAt)
    return new Response("Agreement not yet confirmed", { status: 400 });

  const memberNameEnglish = [member.nameEnglishFirst, member.nameEnglishLast].filter(Boolean).join(" ");
  const fingerprint = (member.confirmedFingerprint ?? null) as DeviceFingerprint | null;

  const pdfBuffer = await buildParticipationAgreementPDF({
    memberNameAmharic: member.nameAmharic,
    memberNameEnglish,
    wheelNumber: member.wheelNumber,
    extraWheelNumber: member.extraWheelNumber,
    weeklyAmountCents: member.weeklyAmount,
    confirmedAt: member.confirmedAt,
    confirmedIp: member.confirmedIp ?? "unknown",
    fingerprint,
  });

  const safeName = memberNameEnglish.replace(/\s+/g, "-").trim() || `wheel-${member.wheelNumber}`;
  const filename = `participation-agreement-${safeName}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
