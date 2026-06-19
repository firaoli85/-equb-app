import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const [w2, w3] = await Promise.all([
    db.week.findUniqueOrThrow({ where: { weekNumber: 2 } }),
    db.week.findUniqueOrThrow({ where: { weekNumber: 3 } }),
  ]);

  console.log("BEFORE:");
  console.log(`  Week 2: winnerWheelNumber=${w2.winnerWheelNumber}, winnerNumbers=[${w2.winnerNumbers}], payoutStatus=${w2.payoutStatus}, payoutMethod=${w2.payoutMethod}`);
  console.log(`  Week 3: winnerWheelNumber=${w3.winnerWheelNumber}, winnerNumbers=[${w3.winnerNumbers}], payoutStatus=${w3.payoutStatus}, payoutMethod=${w3.payoutMethod}`);

  // Week 2: slot [5, 13] — keep COLLECTED/ZELLE
  await db.week.update({
    where: { weekNumber: 2 },
    data: { winnerNumbers: [5, 13], winnerWheelNumber: 5 },
  });

  // Week 3: clear back to not-drawn
  await db.week.update({
    where: { weekNumber: 3 },
    data: {
      winnerWheelNumber: null,
      winnerNumbers: [],
      payoutStatus: null,
      payoutMethod: null,
      payoutNotes: null,
    },
  });

  const [w2After, w3After] = await Promise.all([
    db.week.findUniqueOrThrow({ where: { weekNumber: 2 } }),
    db.week.findUniqueOrThrow({ where: { weekNumber: 3 } }),
  ]);

  console.log("\nAFTER:");
  console.log(`  Week 2: winnerWheelNumber=${w2After.winnerWheelNumber}, winnerNumbers=[${w2After.winnerNumbers}], payoutStatus=${w2After.payoutStatus}, payoutMethod=${w2After.payoutMethod}`);
  console.log(`  Week 3: winnerWheelNumber=${w3After.winnerWheelNumber}, winnerNumbers=[${w3After.winnerNumbers}], payoutStatus=${w3After.payoutStatus}, payoutMethod=${w3After.payoutMethod}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
