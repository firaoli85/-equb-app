import { PrismaClient, Prisma } from "@prisma/client";

const db = new PrismaClient();

// Pure computation helpers — identical to src/lib/equb.ts (no DB dependency).
const MAIN_WHEEL_CAP_CENTS = 100_000;
const TOTAL_WEEKS = 20;

function mainWheelWeekly(weeklyAmountCents: number, hasExtraWheel: boolean): number {
  return hasExtraWheel ? MAIN_WHEEL_CAP_CENTS : weeklyAmountCents;
}
function extraWheelWeekly(weeklyAmountCents: number): number {
  return Math.max(0, weeklyAmountCents - MAIN_WHEEL_CAP_CENTS);
}
function calculateMemberGross(weeklyAmountCents: number): number {
  return weeklyAmountCents * TOTAL_WEEKS;
}
function calculateMemberFee(weeklyAmountCents: number): number {
  const total = weeklyAmountCents * TOTAL_WEEKS;
  return (total / 500_000) * 10_000;
}
function calculateNetPayout(grossCents: number, memberFeeCents: number): number {
  return grossCents - memberFeeCents;
}

async function main() {
  const [payouts, members] = await Promise.all([
    db.weekPayout.findMany({ include: { week: { select: { weekNumber: true } } } }),
    db.member.findMany({ where: { isArchived: false } }),
  ]);

  // Build lookup maps: lucky number → member
  const byMain  = new Map<number, typeof members[0]>();
  const byExtra = new Map<number, typeof members[0]>();
  for (const m of members) {
    byMain.set(m.wheelNumber, m);
    if (m.extraWheelNumber !== null) byExtra.set(m.extraWheelNumber, m);
  }

  console.log("\nBackfill summary:\n");
  console.log(
    "Number".padEnd(8),
    "Week".padEnd(6),
    "memberId".padEnd(30),
    "wheelType".padEnd(10),
    "amountCents".padEnd(13),
    "amountDollars".padEnd(15),
    "status"
  );
  console.log("─".repeat(96));

  for (const payout of payouts) {
    const n = payout.number;
    const weekLabel = `Wk${payout.week.weekNumber}`;

    // Resolve member by integer match
    let resolvedMember: typeof members[0] | undefined;
    let resolvedType: "MAIN" | "EXTRA" = "MAIN";

    if (byMain.has(n)) {
      resolvedMember = byMain.get(n)!;
      resolvedType = "MAIN";
    } else if (byExtra.has(n)) {
      resolvedMember = byExtra.get(n)!;
      resolvedType = "EXTRA";
    }

    if (!resolvedMember) {
      console.log(
        `#${n}`.padEnd(8),
        weekLabel.padEnd(6),
        "NO MATCH".padEnd(30),
        "MAIN".padEnd(10),
        "—".padEnd(13),
        "—".padEnd(15),
        payout.status,
        "  ⚠ WARNING: orphan number — memberId left null"
      );
      // Do not update memberId for orphans — leave null
      continue;
    }

    const hasExtra = resolvedMember.extraWheelNumber !== null;
    const weeklyAmt =
      resolvedType === "EXTRA"
        ? extraWheelWeekly(resolvedMember.weeklyAmount)
        : mainWheelWeekly(resolvedMember.weeklyAmount, hasExtra);

    const gross   = calculateMemberGross(weeklyAmt);
    const fee     = calculateMemberFee(weeklyAmt);
    const netCents = calculateNetPayout(gross, fee);
    // WeekPayout.amount is Decimal(12,2) — store dollars
    const netDollars = new Prisma.Decimal(netCents / 100);

    console.log(
      `#${n}`.padEnd(8),
      weekLabel.padEnd(6),
      resolvedMember.id.padEnd(30),
      resolvedType.padEnd(10),
      String(netCents).padEnd(13),
      netDollars.toFixed(2).padEnd(15),
      payout.status
    );

    // Idempotent: only write fields that need changing
    const needsMemberId   = payout.memberId !== resolvedMember.id;
    const needsWheelType  = payout.wheelType !== resolvedType;
    const needsAmount     = payout.amount === null; // only fill if currently null

    if (!needsMemberId && !needsWheelType && !needsAmount) {
      // Already up to date — skip
      continue;
    }

    const data: Record<string, unknown> = {};
    if (needsMemberId)  data.memberId  = resolvedMember.id;
    if (needsWheelType) data.wheelType = resolvedType;
    if (needsAmount)    data.amount    = netDollars;

    await db.weekPayout.update({ where: { id: payout.id }, data });
  }

  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
