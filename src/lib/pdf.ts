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
