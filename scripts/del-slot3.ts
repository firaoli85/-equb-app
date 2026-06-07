import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  await db.$executeRaw`DELETE FROM wheel_slots WHERE position = 3`;
  const slots = await db.$queryRaw<{ position: number; numbers: number[] }[]>`
    SELECT position, numbers FROM wheel_slots ORDER BY position
  `;
  for (const s of slots) console.log(`pos ${String(s.position).padStart(2)}: [${s.numbers.join(", ")}]`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
