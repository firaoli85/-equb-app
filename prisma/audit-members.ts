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

  // Build number → member lookup
  const byNumber = new Map<number, typeof members[0]>();
  for (const m of members) {
    byNumber.set(m.wheelNumber, m);
    if (m.extraWheelNumber != null) byNumber.set(m.extraWheelNumber, m);
  }

  // ── Members ──────────────────────────────────────────────────────────────
  console.log("\n=== MEMBERS (ordered by wheelNumber) ===");
  console.log(
    "nameAmharic".padEnd(24) +
    "$/wk".padEnd(10) +
    "wheel#".padEnd(9) +
    "extra#"
  );
  console.log("─".repeat(56));
  for (const m of members) {
    const dollars = (m.weeklyAmount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
    console.log(
      m.nameAmharic.padEnd(24) +
      dollars.padEnd(10) +
      String(m.wheelNumber).padEnd(9) +
      (m.extraWheelNumber != null ? String(m.extraWheelNumber) : "—")
    );
  }

  // ── Single-number slots ───────────────────────────────────────────────────
  console.log("\n=== SINGLE-NUMBER SLOTS ===");
  const singles = slots.filter((s) => s.numbers.length === 1);
  console.log(
    "pos".padEnd(6) +
    "lucky#".padEnd(9) +
    "member".padEnd(24) +
    "$/wk"
  );
  console.log("─".repeat(54));
  for (const s of singles) {
    const num = s.numbers[0];
    const m = byNumber.get(num);
    const dollars = m
      ? (m.weeklyAmount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
      : "(no member)";
    console.log(
      String(s.position).padEnd(6) +
      String(num).padEnd(9) +
      (m ? m.nameAmharic : "—").padEnd(24) +
      dollars
    );
  }
  console.log();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
