import { db } from "@/lib/db";
import { buildPaymentHistoryPDF } from "@/lib/pdf";

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
        include: { week: true },
        orderBy: { week: { weekNumber: "asc" } },
      },
    },
  });

  if (!member) return new Response("Not found", { status: 404 });
  if (!member.confirmedAt) return new Response("Agreement not yet confirmed", { status: 400 });

  const memberNameEnglish = [member.nameEnglishFirst, member.nameEnglishLast].filter(Boolean).join(" ");

  const pdfBuffer = await buildPaymentHistoryPDF({
    memberNameAmharic: member.nameAmharic,
    memberNameEnglish,
    weeklyAmountCents: member.weeklyAmount,
    wheelNumber: member.wheelNumber,
    extraWheelNumber: member.extraWheelNumber,
    payments: member.payments.map((p) => ({
      weekNumber: p.week.weekNumber,
      weekDate:   p.week.date,
      status:     p.status as "PENDING" | "PAID" | "LATE" | "DEFERRED",
      method:     p.method as "CASH" | "ZELLE" | "OTHER" | null,
      paidAt:     p.paidAt,
      notes:      p.notes,
    })),
    generatedAt: new Date(),
  });

  const safeName = memberNameEnglish.replace(/\s+/g, "-").trim() || `wheel-${member.wheelNumber}`;
  const filename = `payment-history-${safeName}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
