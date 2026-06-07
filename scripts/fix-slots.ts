import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.$executeRaw`UPDATE wheel_slots SET numbers = ARRAY[39] WHERE position = 13`;
  await db.$executeRaw`UPDATE wheel_slots SET numbers = ARRAY[5, 13] WHERE position = 12`;

  const slots = await db.$queryRaw<{ position: number; numbers: number[] }[]>`
    SELECT position, numbers FROM wheel_slots ORDER BY position
  `;

  console.log("position  numbers");
  console.log("--------  -------");
  for (const s of slots) {
    console.log(`${String(s.position).padStart(8)}  [${s.numbers.join(", ")}]`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
