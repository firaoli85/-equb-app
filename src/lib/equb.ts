import { db } from "./db";

export const EQUB_START = new Date("2026-05-17T00:00:00.000Z");
export const TOTAL_WEEKS = 20;

// Members contributing > $1,000/week get two independent wheel entries.
// The main entry always represents the first $1,000; the extra represents the remainder.
export const MAIN_WHEEL_CAP_CENTS = 100_000; // $1,000/week

export function mainWheelWeekly(weeklyAmountCents: number, hasExtraWheel: boolean): number {
  return hasExtraWheel ? MAIN_WHEEL_CAP_CENTS : weeklyAmountCents;
}

export function extraWheelWeekly(weeklyAmountCents: number): number {
  return Math.max(0, weeklyAmountCents - MAIN_WHEEL_CAP_CENTS);
}

export function generateWeekDates(startDate: Date = EQUB_START): Date[] {
  return Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i * 7);
    return d;
  });
}

export function calculatePot(members: { weeklyAmount: number }[]): number {
  return members.reduce((sum, m) => sum + m.weeklyAmount, 0);
}

// Fee per member based on their own total contribution over 20 weeks
// Formula: (weeklyAmount * 20 / 5_000_00) * 100_00  →  (total / 500_000) * 10_000 (exact, no rounding)
export function calculateMemberFee(weeklyAmountCents: number): number {
  const total = weeklyAmountCents * TOTAL_WEEKS;
  return (total / 500_000) * 10_000;
}

// Gross payout = member's own total contributions (NOT the shared pot)
export function calculateMemberGross(weeklyAmountCents: number): number {
  return weeklyAmountCents * TOTAL_WEEKS;
}

// Net payout = member's gross contributions minus their management fee
export function calculateMemberNet(weeklyAmountCents: number): number {
  const gross = calculateMemberGross(weeklyAmountCents);
  const fee = calculateMemberFee(weeklyAmountCents);
  return gross - fee;
}

// Legacy helper kept for callers that already compute fee separately
export function calculateNetPayout(
  grossCents: number,
  memberFeeCents: number
): number {
  return grossCents - memberFeeCents;
}

// Returns all wheel entry numbers (primary + extra) for the spin wheel.
// Suspended members are excluded entirely.
export function getAvailableWheelEntries(
  members: { wheelNumber: number; extraWheelNumber: number | null; wheelSuspended: boolean }[],
  drawnNumbers: Set<number>
): number[] {
  const entries: number[] = [];
  for (const m of members) {
    if (m.wheelSuspended) continue;
    if (!drawnNumbers.has(m.wheelNumber)) entries.push(m.wheelNumber);
    if (m.extraWheelNumber !== null && !drawnNumbers.has(m.extraWheelNumber)) {
      entries.push(m.extraWheelNumber);
    }
  }
  return entries.sort((a, b) => a - b);
}

export function getDisplayName(member: {
  nameAmharic: string;
  nameEnglishFirst: string;
  displayPreference: "AMHARIC" | "ENGLISH";
}): string {
  if (member.displayPreference === "ENGLISH") {
    return member.nameEnglishFirst || member.nameAmharic;
  }
  return member.nameAmharic;
}

export function getFullEnglishName(member: {
  nameEnglishFirst: string;
  nameEnglishLast: string;
}): string {
  return [member.nameEnglishFirst, member.nameEnglishLast].filter(Boolean).join(" ");
}

export async function ensureWeeksExist(): Promise<void> {
  const count = await db.week.count();
  if (count === 0) {
    const dates = generateWeekDates();
    await db.week.createMany({
      data: dates.map((date, i) => ({
        weekNumber: i + 1,
        date,
      })),
    });
  }
}

export function getCurrentWeekNumber(startDate: Date = EQUB_START): number {
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = now.getTime() - startDate.getTime();
  if (diff < 0) return 0;
  const week = Math.floor(diff / msPerWeek) + 1;
  return Math.min(week, TOTAL_WEEKS);
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
