import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const weeks = await db.week.findMany({
    where: { winnerWheelNumber: { not: null } },
    orderBy: { weekNumber: "asc" },
  });

  console.log(`Found ${weeks.length} drawn week(s). Backfilling winnerNumbers where empty...`);

  for (const w of weeks) {
    if (w.winnerNumbers.length === 0) {
      await db.week.update({
        where: { id: w.id },
        data: { winnerNumbers: [w.winnerWheelNumber!] },
      });
      console.log(`  Week ${w.weekNumber}: set winnerNumbers = [${w.winnerWheelNumber}]`);
    } else {
      console.log(`  Week ${w.weekNumber}: already has winnerNumbers = [${w.winnerNumbers.join(", ")}] — skipped`);
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
