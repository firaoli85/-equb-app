import { db } from "@/lib/db";
import {
  calculateMemberFee,
  calculateMemberGross,
  calculateNetPayout,
  formatDate,
  mainWheelWeekly,
  extraWheelWeekly,
  TOTAL_WEEKS,
} from "@/lib/equb";
import { buildCollectionReceiptPDF } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const isExtra = new URL(req.url).searchParams.get("wheel") === "extra";

  const member = await db.member.findUnique({
    where: { token },
    include: {
      payments: {
        where: { status: "PAID" },
      },
    },
  });

  if (!member) return new Response("Not found", { status: 404 });

  const hasExtra = member.extraWheelNumber !== null;

  if (isExtra) {
    if (!hasExtra) return new Response("No extra wheel for this member", { status: 400 });
    if (!member.collectionConfirmedAtExtra)
      return new Response("Extra wheel collection not yet confirmed", { status: 400 });
  } else {
    if (!member.collectionConfirmedAt)
      return new Response("Collection not yet confirmed", { status: 400 });
  }

  const targetWheelNumber = isExtra ? member.extraWheelNumber! : member.wheelNumber;

  const winnerWeek = await db.week.findFirst({
    where: { winnerWheelNumber: targetWheelNumber },
  });

  if (!winnerWeek)
    return new Response("No winning week found", { status: 400 });

  const weeklyAmountCents = isExtra
    ? extraWheelWeekly(member.weeklyAmount)
    : mainWheelWeekly(member.weeklyAmount, hasExtra);

  const gross = calculateMemberGross(weeklyAmountCents);
  const fee = calculateMemberFee(weeklyAmountCents);
  const net = calculateNetPayout(gross, fee);
  const paidCount = member.payments.length;
  const remainingWeeks = TOTAL_WEEKS - paidCount;
  const memberNameEnglish = [member.nameEnglishFirst, member.nameEnglishLast].filter(Boolean).join(" ");

  const confirmedAt = isExtra ? member.collectionConfirmedAtExtra! : member.collectionConfirmedAt!;
  const confirmedIp = isExtra
    ? (member.collectionConfirmedIpExtra ?? "unknown")
    : (member.collectionConfirmedIp ?? "unknown");

  const pdfBuffer = await buildCollectionReceiptPDF({
    memberNameAmharic: member.nameAmharic,
    memberNameEnglish,
    wheelNumber: targetWheelNumber,
    winnerWheelNumber: winnerWeek.winnerWheelNumber!,
    weeklyAmountCents,
    netCents: net,
    feeCents: fee,
    payoutDate: formatDate(winnerWeek.date),
    remainingWeeks,
    collectionConfirmedAt: confirmedAt,
    collectionConfirmedIp: confirmedIp,
  });

  const safeName = memberNameEnglish.replace(/\s+/g, "-").trim() || `wheel-${targetWheelNumber}`;
  const prefix = isExtra ? "collection-receipt-extra" : "collection-receipt";
  const filename = `${prefix}-${safeName}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
