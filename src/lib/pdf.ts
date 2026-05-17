import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { formatCurrency, formatDate, TOTAL_WEEKS } from "./equb";
import type { DeviceFingerprint } from "./fingerprint";

// Ebrima supports Latin + Ethiopic (Amharic). Loaded once, cached in module scope.
let _fontBuf: Buffer | null = null;
function getFont(): Buffer {
  if (!_fontBuf) {
    _fontBuf = fs.readFileSync(
      path.join(process.cwd(), "public", "fonts", "ebrima.ttf")
    );
  }
  return _fontBuf;
}

// ─── Layout helpers ──────────────────────────────────────────────────────────

function divider(doc: PDFKit.PDFDocument) {
  doc
    .moveTo(50, doc.y)
    .lineTo(562, doc.y)
    .strokeColor("#e5e7eb")
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.6);
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string, isAmharic = false) {
  if (isAmharic) {
    const font = getFont();
    doc.fontSize(11).font(font).fillColor("#1e1b4b").text(title, { characterSpacing: 0.5 });
  } else {
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e1b4b").text(title.toUpperCase(), { characterSpacing: 0.5 });
  }
  doc.moveDown(0.35);
}

function row(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  valueColor = "#111827"
) {
  const y = doc.y;
  doc.fontSize(9).font("Helvetica").fillColor("#6b7280").text(label, 50, y, { width: 220 });
  doc.font("Helvetica").fillColor(valueColor).text(value, 280, y, { width: 282 });
  doc.moveDown(0.2);
}

function rowBold(doc: PDFKit.PDFDocument, label: string, value: string) {
  const y = doc.y;
  doc.fontSize(9).font("Helvetica").fillColor("#6b7280").text(label, 50, y, { width: 220 });
  doc.font("Helvetica-Bold").fillColor("#065f46").text(value, 280, y, { width: 282 });
  doc.moveDown(0.2);
}

// Row where the VALUE is Ethiopic/Amharic — value column uses Ebrima so glyphs render correctly.
function amharicRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  const font = getFont();
  const y = doc.y;
  doc.fontSize(9).font("Helvetica").fillColor("#6b7280").text(label, 50, y, { width: 220 });
  doc.fontSize(9).font(font).fillColor("#111827").text(value, 280, y, { width: 282 });
  doc.moveDown(0.2);
}

// Amharic text rendered with Ebrima font; wrapped to full column width
function amharicPara(doc: PDFKit.PDFDocument, text: string) {
  const font = getFont();
  doc
    .fontSize(10)
    .font(font)
    .fillColor("#1f2937")
    .text(text, 50, doc.y, { width: 512, lineGap: 3 });
  doc.moveDown(0.5);
}

function englishPara(doc: PDFKit.PDFDocument, text: string) {
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#374151")
    .text(text, 50, doc.y, { width: 512, lineGap: 3 });
  doc.moveDown(0.5);
}

function header(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .fillColor("#1e1b4b")
    .text(title, { align: "center" });
  doc.moveDown(0.2);
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#6b7280")
    .text(subtitle, { align: "center" });
  doc.moveDown(0.2);
  doc
    .fontSize(8)
    .fillColor("#9ca3af")
    .text(
      `Generated: ${new Date().toLocaleString("en-US", { timeZone: "UTC" })} UTC`,
      { align: "center" }
    );
  doc.moveDown(1.2);
  divider(doc);
}

function footerNote(doc: PDFKit.PDFDocument) {
  doc.moveDown(0.8);
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#9ca3af")
    .text(
      "This document was generated electronically. The IP address and timestamp recorded above " +
        "serve as the member's digital proof of agreement.",
      50,
      doc.y,
      { width: 512, lineGap: 2 }
    );
}

// ─── Document 1: Participation Agreement ─────────────────────────────────────

export interface ParticipationAgreementData {
  memberNameAmharic: string;
  memberNameEnglish: string;
  wheelNumber: number;
  extraWheelNumber: number | null;
  weeklyAmountCents: number;
  confirmedAt: Date;
  confirmedIp: string;
  fingerprint?: DeviceFingerprint | null;
}

export function buildParticipationAgreementPDF(
  data: ParticipationAgreementData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    const chunks: Buffer[] = [];

    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const weekly = formatCurrency(data.weeklyAmountCents);
    const amharicName = data.memberNameAmharic.length >= 2 ? data.memberNameAmharic : data.memberNameEnglish;
    const englishNameForPara = data.memberNameEnglish || data.memberNameAmharic;

    header(doc, "Participation Agreement", "20-Week Rotating Savings Group — Equb");

    // Member info
    sectionTitle(doc, "Member Information");
    amharicRow(doc, "Name (Amharic)", amharicName);
    if (data.memberNameEnglish) row(doc, "Name (English)", data.memberNameEnglish);
    row(doc, "Wheel Number", `#${data.wheelNumber}${data.extraWheelNumber ? ` + #${data.extraWheelNumber}` : ""}`);
    row(doc, "Weekly Contribution", weekly);
    doc.moveDown(0.6);
    divider(doc);

    // Agreement text (English)
    sectionTitle(doc, "Agreement (English)");
    englishPara(
      doc,
      `I, ${englishNameForPara}, agree to contribute ${weekly} every week for all 20 weeks of this ` +
        `Equb cycle starting May 17, 2026. I understand that if I choose to leave before receiving ` +
        `my collection, I must wait until the Equb ends (September 27, 2026) to receive a refund ` +
        `of my contributions. The management fee will be deducted from any refund. I agree not to ` +
        `disrupt other members by leaving mid-cycle.`
    );
    doc.moveDown(0.4);
    divider(doc);

    // Agreement text (Amharic)
    sectionTitle(doc, "ስምምነት (አማርኛ)", true);
    amharicPara(
      doc,
      `እኔ ${amharicName} በዚህ የዕቁብ ዑደት ውስጥ ለ20 ሳምንታት በሙሉ ${weekly} በየሳምንቱ ` +
        `ለመክፈል እስማማለሁ። ከዕቁብ ስብስቤ በፊት ለመውጣት ከፈለግሁ፣ ለተመላሽ ` +
        `ገንዘቤ እስከ መስከረም 27 ቀን 2026 ዓ.ም ድረስ መጠበቅ እንዳለብኝ ተረድቻለሁ። ` +
        `የአስተዳደር ክፍያ ከተመላሹ ላይ ይቀነሳል።`
    );
    doc.moveDown(0.4);
    divider(doc);

    // Digital confirmation
    sectionTitle(doc, "Digital Confirmation");
    amharicRow(doc, "Confirmed by (Amharic)", amharicName);
    if (data.memberNameEnglish) row(doc, "Confirmed by (English)", data.memberNameEnglish);
    row(doc, "Date & Time (UTC)", data.confirmedAt.toLocaleString("en-US", { timeZone: "UTC" }) + " UTC");
    row(doc, "IP Address", data.confirmedIp);
    if (data.fingerprint) {
      row(doc, "Device", `${data.fingerprint.browser} on ${data.fingerprint.os} — ${data.fingerprint.deviceType}`);
      row(doc, "Screen", data.fingerprint.screen);
      row(doc, "Browser Language", data.fingerprint.language);
      row(doc, "Access Token", data.fingerprint.tokenHint);
    }

    footerNote(doc);
    doc.end();
  });
}

// ─── Document 2: Collection Receipt ──────────────────────────────────────────

export interface CollectionReceiptData {
  memberNameAmharic: string;
  memberNameEnglish: string;
  wheelNumber: number;
  winnerWheelNumber: number;
  weeklyAmountCents: number;
  netCents: number;
  feeCents: number;
  payoutDate: string;
  remainingWeeks: number;
  collectionConfirmedAt: Date;
  collectionConfirmedIp: string;
  fingerprint?: DeviceFingerprint | null;
}

export function buildCollectionReceiptPDF(
  data: CollectionReceiptData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    const chunks: Buffer[] = [];

    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const weekly = formatCurrency(data.weeklyAmountCents);
    const net = formatCurrency(data.netCents);
    const fee = formatCurrency(data.feeCents);
    const amharicName = data.memberNameAmharic.length >= 2 ? data.memberNameAmharic : data.memberNameEnglish;
    const englishNameForPara = data.memberNameEnglish || data.memberNameAmharic;

    header(doc, "Collection Receipt Agreement", "20-Week Rotating Savings Group — Equb");

    // Details
    sectionTitle(doc, "Collection Details");
    amharicRow(doc, "Name (Amharic)", amharicName);
    if (data.memberNameEnglish) row(doc, "Name (English)", data.memberNameEnglish);
    row(doc, "Wheel Number", `#${data.winnerWheelNumber}`);
    row(doc, "Payout Week", `Week ${data.winnerWheelNumber}`);
    row(doc, "Payout Date", data.payoutDate);
    row(doc, "Management Fee", `−${fee}`, "#92400e");
    rowBold(doc, "Net Amount Received", net);
    row(doc, "Weeks Remaining", `${data.remainingWeeks} of ${TOTAL_WEEKS}`);
    doc.moveDown(0.6);
    divider(doc);

    // Agreement text (English)
    sectionTitle(doc, "Agreement (English)");
    englishPara(
      doc,
      `I, ${englishNameForPara}, confirm that I received ${net} on ${data.payoutDate} as my Equb ` +
        `collection for Week ${data.winnerWheelNumber}. A management fee of ${fee} was deducted. ` +
        `I agree to continue making my weekly contribution of ${weekly} for the remaining ` +
        `${data.remainingWeeks} weeks until Week 20 (September 27, 2026), regardless of having ` +
        `received my collection.`
    );
    doc.moveDown(0.4);
    divider(doc);

    // Agreement text (Amharic)
    sectionTitle(doc, "ስምምነት (አማርኛ)", true);
    amharicPara(
      doc,
      `እኔ ${amharicName} በሳምንት ${data.winnerWheelNumber} ላይ ${net} እንደተቀበልኩ ` +
        `አረጋግጣለሁ። ${fee} የአስተዳደር ክፍያ ተቀንሷል። ለቀሪዎቹ ${data.remainingWeeks} ሳምንታት ` +
        `እስከ ሳምንት 20 ድረስ ${weekly} የሳምንታዊ ክፍያዬን መክፈሌን እንደምቀጥል እስማማለሁ።`
    );
    doc.moveDown(0.4);
    divider(doc);

    // Digital confirmation
    sectionTitle(doc, "Digital Confirmation");
    amharicRow(doc, "Confirmed by (Amharic)", amharicName);
    if (data.memberNameEnglish) row(doc, "Confirmed by (English)", data.memberNameEnglish);
    row(doc, "Date & Time (UTC)", data.collectionConfirmedAt.toLocaleString("en-US", { timeZone: "UTC" }) + " UTC");
    row(doc, "IP Address", data.collectionConfirmedIp);
    if (data.fingerprint) {
      row(doc, "Device", `${data.fingerprint.browser} on ${data.fingerprint.os} — ${data.fingerprint.deviceType}`);
      row(doc, "Screen", data.fingerprint.screen);
      row(doc, "Browser Language", data.fingerprint.language);
      row(doc, "Access Token", data.fingerprint.tokenHint);
    }

    footerNote(doc);
    doc.end();
  });
}

// ─── Payment History PDF ──────────────────────────────────────────────────────

export interface PaymentHistoryEntry {
  weekNumber: number;
  weekDate: Date;
  status: "PENDING" | "PAID" | "LATE" | "DEFERRED";
  method: "CASH" | "ZELLE" | "OTHER" | null;
  paidAt: Date | null;
  notes: string | null;
}

export interface PaymentHistoryData {
  memberNameAmharic: string;
  memberNameEnglish: string;
  weeklyAmountCents: number;
  wheelNumber: number;
  extraWheelNumber: number | null;
  payments: PaymentHistoryEntry[];
  generatedAt: Date;
}

export function buildPaymentHistoryPDF(data: PaymentHistoryData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#064e3b")
      .text("Equb Payment History", 50, 50, { align: "center" });
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#6b7280")
      .text(`Generated ${data.generatedAt.toLocaleDateString("en-US", { timeZone: "UTC" })} · All times UTC`, { align: "center" });
    doc.moveDown(1.2);

    divider(doc);

    // Member info
    sectionTitle(doc, "Member Information");
    if (data.memberNameEnglish) row(doc, "English Name", data.memberNameEnglish);
    const font = getFont();
    const y = doc.y;
    doc.fontSize(9).font("Helvetica").fillColor("#6b7280").text("Amharic Name", 50, y, { width: 220 });
    doc.font(font).fillColor("#111827").text(data.memberNameAmharic, 280, y, { width: 282 });
    doc.moveDown(0.2);
    row(doc, "Wheel Number", `#${data.wheelNumber}${data.extraWheelNumber ? ` (extra: #${data.extraWheelNumber})` : ""}`);
    row(doc, "Weekly Contribution", formatCurrency(data.weeklyAmountCents));
    doc.moveDown(0.4);
    divider(doc);

    // Summary counts
    const paid     = data.payments.filter((p) => p.status === "PAID").length;
    const late     = data.payments.filter((p) => p.status === "LATE").length;
    const deferred = data.payments.filter((p) => p.status === "DEFERRED").length;
    const pending  = data.payments.filter((p) => p.status === "PENDING").length;

    sectionTitle(doc, "Summary");
    row(doc, "Total Weeks",    String(TOTAL_WEEKS));
    row(doc, "Paid",           String(paid),     "#059669");
    row(doc, "Late",           String(late),     "#d97706");
    row(doc, "Deferred",       String(deferred), "#ea580c");
    row(doc, "Pending",        String(pending),  "#6b7280");
    doc.moveDown(0.4);
    divider(doc);

    // Payment table
    sectionTitle(doc, "Week-by-Week Detail");

    // Column x positions and widths
    const COL = {
      week:   { x: 50,  w: 30  },
      date:   { x: 88,  w: 82  },
      status: { x: 178, w: 88  },
      method: { x: 274, w: 60  },
      paid:   { x: 342, w: 72  },
      notes:  { x: 422, w: 140 },
    };
    // Fixed row height — never rely on doc.y advancing between columns
    const ROW_H = 14;

    const statusLabel: Record<string, string> = {
      PAID:     "Paid",
      LATE:     "Late",
      PENDING:  "Pending",
      DEFERRED: "Deferred",
    };
    const statusColor: Record<string, string> = {
      PAID:     "#059669",
      LATE:     "#d97706",
      PENDING:  "#9ca3af",
      DEFERRED: "#ea580c",
    };

    // Draw column headers at an explicit y, return the y for the first data row
    function drawTableHeader(y: number): void {
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#374151");
      doc.text("Wk",      COL.week.x,   y, { width: COL.week.w,   lineBreak: false });
      doc.text("Date",    COL.date.x,   y, { width: COL.date.w,   lineBreak: false });
      doc.text("Status",  COL.status.x, y, { width: COL.status.w, lineBreak: false });
      doc.text("Method",  COL.method.x, y, { width: COL.method.w, lineBreak: false });
      doc.text("Paid On", COL.paid.x,   y, { width: COL.paid.w,   lineBreak: false });
      doc.text("Notes",   COL.notes.x,  y, { width: COL.notes.w,  lineBreak: false });
      // Underline below header
      doc
        .moveTo(50, y + ROW_H - 3)
        .lineTo(562, y + ROW_H - 3)
        .strokeColor("#d1d5db")
        .lineWidth(0.5)
        .stroke();
    }

    // tableY is the sole y-position counter — never touched by doc.y after this point
    let tableY = doc.y;
    drawTableHeader(tableY);
    tableY += ROW_H;

    for (const p of data.payments) {
      // Page break: add new page and re-draw the column header
      if (tableY > 700) {
        doc.addPage();
        tableY = 60;
        drawTableHeader(tableY);
        tableY += ROW_H;
      }

      const color = statusColor[p.status] ?? "#111827";

      doc.fontSize(8).font("Helvetica").fillColor("#111827");
      doc.text(String(p.weekNumber),                   COL.week.x,   tableY, { width: COL.week.w,   lineBreak: false });
      doc.text(formatDate(p.weekDate),                 COL.date.x,   tableY, { width: COL.date.w,   lineBreak: false });
      doc.fillColor(color);
      doc.text(statusLabel[p.status] ?? p.status,      COL.status.x, tableY, { width: COL.status.w, lineBreak: false });
      doc.fillColor("#111827");
      doc.text(p.method ?? "—",                       COL.method.x, tableY, { width: COL.method.w, lineBreak: false });
      doc.text(p.paidAt ? formatDate(p.paidAt) : "—", COL.paid.x,   tableY, { width: COL.paid.w,   lineBreak: false });
      doc.text(p.notes ?? "—",                        COL.notes.x,  tableY, { width: COL.notes.w,  lineBreak: false });

      tableY += ROW_H;
    }

    // Re-sync doc.y to the manual counter before footer
    doc.text("", 50, tableY + 8);
    doc.moveDown(0.5);
    footerNote(doc);
    doc.end();
  });
}
