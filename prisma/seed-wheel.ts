import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SLOTS: { position: number; numbers: number[] }[] = [
  { position:  1, numbers: [1, 3] },
  { position:  2, numbers: [4, 29] },
  { position:  3, numbers: [6, 13] },
  { position:  4, numbers: [7, 10] },
  { position:  5, numbers: [11, 34] },
  { position:  6, numbers: [12, 27] },
  { position:  7, numbers: [14, 21] },
  { position:  8, numbers: [15] },
  { position:  9, numbers: [155, 19] },
  { position: 10, numbers: [2] },
  { position: 11, numbers: [22] },
  { position: 12, numbers: [5] },
  { position: 13, numbers: [55] },
  { position: 14, numbers: [24, 30, 619] },
  { position: 15, numbers: [8] },
  { position: 16, numbers: [9] },
  { position: 17, numbers: [16] },
  { position: 18, numbers: [18] },
  { position: 19, numbers: [25] },
  { position: 20, numbers: [78] },
];

const PRIORITY_NUMBERS = [5, 39, 11, 34];

async function main() {
  // Upsert all 20 slots
  for (const slot of SLOTS) {
    await db.wheelSlot.upsert({
      where:  { position: slot.position },
      update: { numbers: slot.numbers },
      create: { position: slot.position, numbers: slot.numbers },
    });
  }

  // Upsert singleton WheelConfig (id = 1)
  await db.wheelConfig.upsert({
    where:  { id: 1 },
    update: { priorityNumbers: PRIORITY_NUMBERS },
    create: { id: 1, priorityNumbers: PRIORITY_NUMBERS },
  });

  // Verify — print all slots and the config row
  const slots = await db.wheelSlot.findMany({ orderBy: { position: "asc" } });
  const config = await db.wheelConfig.findUnique({ where: { id: 1 } });

  console.log("\n=== wheel_slots ===");
  for (const s of slots) {
    console.log(`  pos ${String(s.position).padStart(2)}: [${s.numbers.join(", ")}]`);
  }
  console.log("\n=== wheel_config ===");
  console.log(`  id: ${config?.id}`);
  console.log(`  priorityNumbers: [${config?.priorityNumbers.join(", ")}]`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
