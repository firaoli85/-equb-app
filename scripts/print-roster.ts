import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const [members, slots] = await Promise.all([
    db.member.findMany({
      where: { isArchived: false },
      orderBy: { wheelNumber: "asc" },
      select: { nameAmharic: true, weeklyAmount: true, wheelNumber: true, extraWheelNumber: true },
    }),
    db.wheelSlot.findMany({ orderBy: { position: "asc" } }),
  ]);

  const byNumber = new Map<number, typeof members[0]>();
  for (const m of members) {
    byNumber.set(m.wheelNumber, m);
    if (m.extraWheelNumber != null) byNumber.set(m.extraWheelNumber, m);
  }

  console.log("=== MEMBERS ===");
  for (const m of members) {
    const num = m.extraWheelNumber != null ? `#${m.wheelNumber}/${m.extraWheelNumber}` : `#${m.wheelNumber}`;
    const amt = `$${m.weeklyAmount / 100}`;
    console.log(`${num.padEnd(12)}  ${amt.padEnd(10)}  ${m.nameAmharic}`);
  }

  console.log("\n=== SINGLE-NUMBER SLOTS ===");
  for (const s of slots) {
    if (s.numbers.length !== 1) continue;
    const n = s.numbers[0];
    const m = byNumber.get(n);
    const owner = m ? `${m.nameAmharic}  $${m.weeklyAmount / 100}` : "NO MEMBER";
    console.log(`pos ${String(s.position).padStart(2)}: [${n}]  ->  ${owner}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
