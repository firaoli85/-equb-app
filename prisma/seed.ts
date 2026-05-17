import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const EQUB_START = new Date("2026-05-17T00:00:00.000Z");
const TOTAL_WEEKS = 20;

const SEED_MEMBERS = [
  { nameAmharic: "ትዝታ",    nameEnglishFirst: "Tizita",    nameEnglishLast: "",        weeklyAmount:  50_000, wheelNumber:  1, extraWheelNumber: null },
  { nameAmharic: "ሙልጌታ",  nameEnglishFirst: "Mulgeta",   nameEnglishLast: "",        weeklyAmount: 200_000, wheelNumber:  2, extraWheelNumber: 22 },
  { nameAmharic: "አያንቱ",  nameEnglishFirst: "Ayantu",    nameEnglishLast: "",        weeklyAmount:  50_000, wheelNumber:  3, extraWheelNumber: null },
  { nameAmharic: "ምዓራፍ",  nameEnglishFirst: "Mearaf",    nameEnglishLast: "",        weeklyAmount:  50_000, wheelNumber:  4, extraWheelNumber: null },
  { nameAmharic: "ፍራኦሊ",  nameEnglishFirst: "Firaoli",   nameEnglishLast: "Seboka",  weeklyAmount: 200_000, wheelNumber:  5, extraWheelNumber: 55 },
  { nameAmharic: "ሄለን",    nameEnglishFirst: "Helen",     nameEnglishLast: "",        weeklyAmount:  50_000, wheelNumber:  6, extraWheelNumber: null },
  { nameAmharic: "ማርቆስ",  nameEnglishFirst: "Markos",    nameEnglishLast: "",        weeklyAmount: 100_000, wheelNumber:  7, extraWheelNumber: null },
  { nameAmharic: "ጌታሁን",  nameEnglishFirst: "Getahun",   nameEnglishLast: "",        weeklyAmount: 175_000, wheelNumber:  8, extraWheelNumber: 88 },
  { nameAmharic: "መላኩ",   nameEnglishFirst: "Melaku",    nameEnglishLast: "",        weeklyAmount: 100_000, wheelNumber:  9, extraWheelNumber: null },
  { nameAmharic: "ሙልቀን",  nameEnglishFirst: "Mulken",    nameEnglishLast: "",        weeklyAmount: 100_000, wheelNumber: 10, extraWheelNumber: null },
  { nameAmharic: "ፂዮን",   nameEnglishFirst: "Tsion",     nameEnglishLast: "",        weeklyAmount:  75_000, wheelNumber: 11, extraWheelNumber: null },
  { nameAmharic: "ቤቴልሄም", nameEnglishFirst: "Bethelhem", nameEnglishLast: "",        weeklyAmount:  62_500, wheelNumber: 12, extraWheelNumber: null },
  { nameAmharic: "ፍቃዱ",   nameEnglishFirst: "Fekadu",    nameEnglishLast: "",        weeklyAmount:  50_000, wheelNumber: 13, extraWheelNumber: null },
  { nameAmharic: "ፍሬ",    nameEnglishFirst: "Fre",       nameEnglishLast: "",        weeklyAmount:  50_000, wheelNumber: 14, extraWheelNumber: null },
  { nameAmharic: "ዜድ",    nameEnglishFirst: "Zed",       nameEnglishLast: "",        weeklyAmount:  25_000, wheelNumber: 15, extraWheelNumber: null },
  { nameAmharic: "አሌክስ",  nameEnglishFirst: "Alex",      nameEnglishLast: "",        weeklyAmount: 100_000, wheelNumber: 16, extraWheelNumber: null },
  { nameAmharic: "ስምረት",  nameEnglishFirst: "Simret",    nameEnglishLast: "",        weeklyAmount:  50_000, wheelNumber: 17, extraWheelNumber: null },
  { nameAmharic: "ሃና",    nameEnglishFirst: "Hana",      nameEnglishLast: "",        weeklyAmount:  25_000, wheelNumber: 18, extraWheelNumber: null },
  { nameAmharic: "ሃና ቤ",  nameEnglishFirst: "Hana B",    nameEnglishLast: "",        weeklyAmount:  62_500, wheelNumber: 19, extraWheelNumber: null },
  { nameAmharic: "መላኩ ወ", nameEnglishFirst: "Melaku W",  nameEnglishLast: "",        weeklyAmount:  62_500, wheelNumber: 20, extraWheelNumber: null },
  { nameAmharic: "በሙልቀን", nameEnglishFirst: "Bemulken",  nameEnglishLast: "",        weeklyAmount:  50_000, wheelNumber: 21, extraWheelNumber: null },
];

async function ensureWeeks() {
  const count = await db.week.count();
  if (count > 0) return;
  const data = Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const date = new Date(EQUB_START);
    date.setDate(date.getDate() + i * 7);
    return { weekNumber: i + 1, date };
  });
  await db.week.createMany({ data });
  console.log(`Created ${TOTAL_WEEKS} weeks.`);
}

async function main() {
  await ensureWeeks();

  const weeks = await db.week.findMany({ orderBy: { weekNumber: "asc" } });

  const seedWheelNumbers = SEED_MEMBERS.map((m) => m.wheelNumber);
  const { count: deletedCount } = await db.member.deleteMany({
    where: { wheelNumber: { notIn: seedWheelNumbers } },
  });
  if (deletedCount > 0) console.log(`Removed ${deletedCount} stale member(s).`);

  for (const m of SEED_MEMBERS) {
    // wheelNumber is no longer globally unique (partial index for active members only)
    // so we look up by wheelNumber + isArchived:false for upsert logic
    const existing = await db.member.findFirst({
      where: { wheelNumber: m.wheelNumber, isArchived: false },
    });
    const member = existing
      ? await db.member.update({
          where: { id: existing.id },
          data: {
            nameAmharic: m.nameAmharic,
            nameEnglishFirst: m.nameEnglishFirst,
            nameEnglishLast: m.nameEnglishLast,
            weeklyAmount: m.weeklyAmount,
            extraWheelNumber: m.extraWheelNumber,
          },
        })
      : await db.member.create({
          data: {
            nameAmharic: m.nameAmharic,
            nameEnglishFirst: m.nameEnglishFirst,
            nameEnglishLast: m.nameEnglishLast,
            weeklyAmount: m.weeklyAmount,
            wheelNumber: m.wheelNumber,
            extraWheelNumber: m.extraWheelNumber,
          },
        });

    const { count: created } = await db.payment.createMany({
      data: weeks.map((w) => ({
        memberId: member.id,
        weekId: w.id,
        status: "PENDING" as const,
      })),
      skipDuplicates: true,
    });

    const tag = created > 0 ? `(+${created} payments)` : "(existing)";
    const extra = m.extraWheelNumber ? ` +#${m.extraWheelNumber}` : "";
    const eng = [m.nameEnglishFirst, m.nameEnglishLast].filter(Boolean).join(" ");
    console.log(`  ✓  #${String(m.wheelNumber).padEnd(3)}${extra.padEnd(5)} ${m.nameAmharic.padEnd(8)} ${eng} ${tag}`);
  }

  const total = SEED_MEMBERS.reduce((s, m) => s + m.weeklyAmount, 0);
  console.log(`\nSeeded ${SEED_MEMBERS.length} members. Weekly pot: $${(total / 100).toLocaleString()}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
