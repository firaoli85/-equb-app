"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export async function unlockPriorityNumbers(
  passphrase: string
): Promise<{ error?: "unavailable" | "invalid"; priorityNumbers?: number[] }> {
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error(auth.error);

  const key = process.env.WHEEL_KEY;
  if (!key) return { error: "unavailable" };
  if (passphrase !== key) return { error: "invalid" };
  const config = await db.wheelConfig.findUnique({ where: { id: 1 } });
  return { priorityNumbers: config?.priorityNumbers ?? [] };
}

export async function getWheelMemberNames(): Promise<Record<number, string>> {
  const members = await db.member.findMany({
    where: { isArchived: false },
    select: { nameAmharic: true, wheelNumber: true, extraWheelNumber: true },
  });
  const result: Record<number, string> = {};
  for (const m of members) {
    result[m.wheelNumber] = m.nameAmharic;
    if (m.extraWheelNumber != null) result[m.extraWheelNumber] = m.nameAmharic;
  }
  return result;
}

export async function saveWheelSlots(
  newSlots: { position: number; numbers: number[] }[]
): Promise<{ error?: string; warning?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const [members, dbSlots, drawn] = await Promise.all([
    db.member.findMany({
      where: { isArchived: false },
      select: { wheelNumber: true, extraWheelNumber: true },
    }),
    db.wheelSlot.findMany(),
    db.weekPayout.findMany({ select: { number: true } }),
  ]);

  const memberNumbers = new Set<number>();
  for (const m of members) {
    memberNumbers.add(m.wheelNumber);
    if (m.extraWheelNumber != null) memberNumbers.add(m.extraWheelNumber);
  }

  const drawnNumbers = new Set<number>(drawn.map((p) => p.number));

  // Locked = any slot in DB that contains a drawn number
  const dbSlotMap = new Map(
    dbSlots.map((s) => [s.position, [...s.numbers].sort((a, b) => a - b)])
  );
  const lockedPositions = new Set<number>(
    dbSlots.filter((s) => s.numbers.some((n) => drawnNumbers.has(n))).map((s) => s.position)
  );

  // 1. No duplicate numbers across slots
  const seen = new Map<number, number>();
  for (const s of newSlots) {
    for (const n of s.numbers) {
      if (seen.has(n)) {
        return {
          error: `Lucky #${n} appears in both slot ${seen.get(n)} and slot ${s.position}. Each number must appear in at most one slot.`,
        };
      }
      seen.set(n, s.position);
    }
  }

  // 2. Locked slots must be present and unchanged
  for (const pos of lockedPositions) {
    const dbNums = dbSlotMap.get(pos) ?? [];
    const submitted = newSlots.find((s) => s.position === pos);
    const submittedNums = [...(submitted?.numbers ?? [])].sort((a, b) => a - b);
    if (JSON.stringify(dbNums) !== JSON.stringify(submittedNums)) {
      return {
        error: `Slot pos ${pos} contains a drawn lucky number and cannot be modified.`,
      };
    }
  }

  // 3. No ghost numbers (in a slot but not on any member)
  for (const s of newSlots) {
    for (const n of s.numbers) {
      if (!memberNumbers.has(n)) {
        return {
          error: `Lucky #${n} in slot pos ${s.position} belongs to no member. Remove it before saving.`,
        };
      }
    }
  }

  // 4. Warn about member numbers absent from all slots (allowed, not blocked)
  const allSlotNums = new Set(newSlots.flatMap((s) => s.numbers));
  const unassigned = [...memberNumbers].filter((n) => !allSlotNums.has(n)).sort((a, b) => a - b);

  // Replace all slot rows atomically
  await db.$transaction(async (tx) => {
    await tx.wheelSlot.deleteMany();
    if (newSlots.length > 0) {
      await tx.wheelSlot.createMany({
        data: newSlots.map((s) => ({ position: s.position, numbers: s.numbers })),
      });
    }
    await tx.auditLog.create({
      data: {
        action: `Wheel slots saved: ${newSlots.length} slot${newSlots.length !== 1 ? "s" : ""}${
          unassigned.length > 0 ? `; unassigned numbers: [${unassigned.join(", ")}]` : ""
        }`,
        entityType: "WheelSlot",
        entityId: "wheel_slots",
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/wheel");

  return unassigned.length > 0
    ? {
        warning: `Saved. ${unassigned.length} member number${unassigned.length > 1 ? "s" : ""} not in any slot: [${unassigned.join(", ")}].`,
      }
    : {};
}

export async function savePriorityNumbers(
  numbers: number[],
  passphrase: string
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const key = process.env.WHEEL_KEY;
  if (!key || passphrase !== key) return { error: "Unauthorized." };

  const members = await db.member.findMany({
    where: { isArchived: false },
    select: { wheelNumber: true, extraWheelNumber: true },
  });

  const memberNumbers = new Set<number>();
  for (const m of members) {
    memberNumbers.add(m.wheelNumber);
    if (m.extraWheelNumber != null) memberNumbers.add(m.extraWheelNumber);
  }

  for (const n of numbers) {
    if (!memberNumbers.has(n)) {
      return { error: `Lucky #${n} belongs to no member.` };
    }
  }

  await db.$transaction(async (tx) => {
    await tx.wheelConfig.upsert({
      where: { id: 1 },
      update: { priorityNumbers: numbers },
      create: { id: 1, priorityNumbers: numbers },
    });
    await tx.auditLog.create({
      data: {
        action: `Wheel priority numbers updated: [${numbers.join(", ")}]`,
        entityType: "WheelConfig",
        entityId: "1",
      },
    });
  });

  revalidatePath("/admin/wheel");
  return {};
}
