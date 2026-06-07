import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const [members, slots] = await Promise.all([
    db.member.findMany({
      where: { isArchived: false },
      orderBy: { wheelNumber: "asc" },
      select: {
        nameAmharic: true,
        weeklyAmount: true,
        wheelNumber: true,
        extraWheelNumber: true,
        wheelSuspended: true,
      },
    }),
    db.wheelSlot.findMany({ orderBy: { position: "asc" } }),
  ]);

  // ── Members ────────────────────────────────────────────────────────────────
  console.log("\n=== MEMBERS (non-archived, ordered by wheelNumber) ===");
  const colW = [28, 14, 8, 14, 11];
  const hdr = [
    "nameAmharic".padEnd(colW[0]),
    "weeklyAmount".padEnd(colW[1]),
    "wheel#".padEnd(colW[2]),
    "extraWheel#".padEnd(colW[3]),
    "suspended".padEnd(colW[4]),
  ].join("  ");
  console.log(hdr);
  console.log("─".repeat(hdr.length));

  for (const m of members) {
    console.log(
      [
        m.nameAmharic.padEnd(colW[0]),
        String(m.weeklyAmount).padEnd(colW[1]),
        String(m.wheelNumber).padEnd(colW[2]),
        (m.extraWheelNumber != null ? String(m.extraWheelNumber) : "—").padEnd(colW[3]),
        String(m.wheelSuspended).padEnd(colW[4]),
      ].join("  ")
    );
  }

  // ── Wheel slots ────────────────────────────────────────────────────────────
  console.log("\n=== WHEEL SLOTS (ordered by position) ===");
  for (const s of slots) {
    console.log(`  pos ${String(s.position).padStart(2)}: [${s.numbers.join(", ")}]`);
  }

  // ── Build sets for comparison ──────────────────────────────────────────────
  const memberNumbers = new Set<number>();
  for (const m of members) {
    memberNumbers.add(m.wheelNumber);
    if (m.extraWheelNumber != null) memberNumbers.add(m.extraWheelNumber);
  }

  const slotNumbers = new Set<number>();
  for (const s of slots) {
    for (const n of s.numbers) slotNumbers.add(n);
  }

  // ── Mismatch analysis ──────────────────────────────────────────────────────
  const onMemberNotInSlot = [...memberNumbers].filter((n) => !slotNumbers.has(n)).sort((a, b) => a - b);
  const inSlotNotOnMember = [...slotNumbers].filter((n) => !memberNumbers.has(n)).sort((a, b) => a - b);

  console.log("\n=== MISMATCH: on a member but NOT in any wheel slot ===");
  if (onMemberNotInSlot.length === 0) {
    console.log("  (none)");
  } else {
    for (const n of onMemberNotInSlot) {
      const owner = members.find((m) => m.wheelNumber === n || m.extraWheelNumber === n)!;
      const which = owner.wheelNumber === n ? "primary" : "extra";
      console.log(`  #${n}  →  ${owner.nameAmharic}  (${which})`);
    }
  }

  console.log("\n=== MISMATCH: in a wheel slot but belongs to NO member ===");
  if (inSlotNotOnMember.length === 0) {
    console.log("  (none)");
  } else {
    for (const n of inSlotNotOnMember) {
      const ownerSlot = slots.find((s) => s.numbers.includes(n))!;
      console.log(`  #${n}  →  slot pos ${ownerSlot.position}  [${ownerSlot.numbers.join(", ")}]`);
    }
  }

  console.log();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
