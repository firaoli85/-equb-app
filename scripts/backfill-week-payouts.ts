import { PrismaClient, PayoutMethod } from "@prisma/client";
const db = new PrismaClient();

function toPayoutMethod(cm: string | null): PayoutMethod | null {
  if (cm === "CASH") return PayoutMethod.CASH;
  if (cm === "ZELLE") return PayoutMethod.ZELLE;
  if (cm === "BOTH") return PayoutMethod.BOTH;
  return null;
}

async function main() {
  const weeks = await db.week.findMany({
    where: { winnerNumbers: { isEmpty: false } },
    orderBy: { weekNumber: "asc" },
  });

  console.log(`Found ${weeks.length} drawn week(s) with winnerNumbers.`);

  for (const week of weeks) {
    const created: string[] = [];
    const skipped: number[] = [];

    for (const number of week.winnerNumbers) {
      const existing = await db.weekPayout.findUnique({
        where: { weekId_number: { weekId: week.id, number } },
      });

      if (existing) {
        skipped.push(number);
        continue;
      }

      // Only the original drawn winner (winnerWheelNumber) gets COLLECTED status.
      // Every other number in the slot is treated as PENDING regardless of week.payoutStatus.
      const isOriginalWinner =
        number === week.winnerWheelNumber && week.payoutStatus === "COLLECTED";

      await db.weekPayout.create({
        data: {
          weekId: week.id,
          number,
          amount: null,
          status: isOriginalWinner ? "COLLECTED" : "PENDING",
          method: isOriginalWinner ? toPayoutMethod(week.payoutMethod ?? null) : null,
          collectedAt: isOriginalWinner ? week.date : null,
        },
      });

      const statusLine = isOriginalWinner
        ? `COLLECTED / ${week.payoutMethod ?? "null"}`
        : "PENDING / null";
      created.push(`#${number} → ${statusLine}`);
    }

    if (created.length > 0) {
      for (const line of created) {
        console.log(`  Week ${week.weekNumber}: created ${line}`);
      }
    }
    if (skipped.length > 0) {
      console.log(`  Week ${week.weekNumber}: skipped (already exist) [${skipped.join(", ")}]`);
    }
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
