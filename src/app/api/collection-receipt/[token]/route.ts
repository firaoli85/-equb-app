import { db } from "@/lib/db";
import {
  calculateMemberFee,
  calculateMemberGross,
  calculateNetPayout,
  formatDate,
  TOTAL_WEEKS,
} from "@/lib/equb";
import { buildCollectionReceiptPDF } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const member = await db.member.findUnique({
    where: { token },
    include: {
      payments: {
        where: { status: "PAID" },
      },
    },
  });

  if (!member) return new Response("Not found", { status: 404 });
  if (!member.collectionConfirmedAt)
    return new Response("Collection not yet confirmed", { status: 400 });

  // Find which week the member won
  const winnerWeek = await db.week.findFirst({
    where: {
      OR: [
        { winnerWheelNumber: member.wheelNumber },
        ...(member.extraWheelNumber !== null
          ? [{ winnerWheelNumber: member.extraWheelNumber }]
          : []),
      ],
    },
  });

  if (!winnerWeek)
    return new Response("No winning week found", { status: 400 });

  const gross = calculateMemberGross(member.weeklyAmount);
  const fee = calculateMemberFee(member.weeklyAmount);
  const net = calculateNetPayout(gross, fee);
  const paidCount = member.payments.length;
  const remainingWeeks = TOTAL_WEEKS - paidCount;
  const memberNameEnglish = [member.nameEnglishFirst, member.nameEnglishLast].filter(Boolean).join(" ");

  const pdfBuffer = await buildCollectionReceiptPDF({
    memberNameAmharic: member.nameAmharic,
    memberNameEnglish,
    wheelNumber: member.wheelNumber,
    winnerWheelNumber: winnerWeek.winnerWheelNumber!,
    weeklyAmountCents: member.weeklyAmount,
    netCents: net,
    feeCents: fee,
    payoutDate: formatDate(winnerWeek.date),
    remainingWeeks,
    collectionConfirmedAt: member.collectionConfirmedAt,
    collectionConfirmedIp: member.collectionConfirmedIp ?? "unknown",
  });

  const safeName = memberNameEnglish.replace(/\s+/g, "-").trim() || `wheel-${member.wheelNumber}`;
  const filename = `collection-receipt-${safeName}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
