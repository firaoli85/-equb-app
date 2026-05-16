"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { buildFingerprint, type ClientFingerprint } from "@/lib/fingerprint";

export async function createMember(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const nameAmharic = (formData.get("nameAmharic") as string)?.trim();
  const nameEnglishFirst = (formData.get("nameEnglishFirst") as string)?.trim() ?? "";
  const nameEnglishLast = (formData.get("nameEnglishLast") as string)?.trim() ?? "";
  const phone = (formData.get("phone") as string)?.trim() || null;
  const weeklyDollars = parseFloat(formData.get("weeklyAmount") as string);
  const wheelNumber = parseInt(formData.get("wheelNumber") as string, 10);
  const extraWheelRaw = (formData.get("extraWheelNumber") as string)?.trim();
  const extraWheelNumber = extraWheelRaw ? parseInt(extraWheelRaw, 10) : null;

  if (!nameAmharic || isNaN(weeklyDollars) || isNaN(wheelNumber)) {
    return { error: "Amharic name, weekly amount, and wheel number are required." };
  }
  if (nameAmharic.length < 2) return { error: "Amharic name must be at least 2 characters." };
  if (weeklyDollars < 1) return { error: "Weekly amount must be at least $1." };
  if (wheelNumber < 1) return { error: "Wheel number must be a positive number." };
  if (extraWheelNumber !== null && (isNaN(extraWheelNumber) || extraWheelNumber < 1)) {
    return { error: "Extra wheel number must be a positive number." };
  }

  const weeklyAmount = Math.round(weeklyDollars * 100);

  try {
    const weeks = await db.week.findMany({ orderBy: { weekNumber: "asc" } });
    if (weeks.length === 0) return { error: "Weeks not initialized. Reload the page and try again." };

    const member = await db.member.create({
      data: { nameAmharic, nameEnglishFirst, nameEnglishLast, phone, weeklyAmount, wheelNumber, extraWheelNumber },
    });

    await db.payment.createMany({
      data: weeks.map((w: { id: string }) => ({
        memberId: member.id,
        weekId: w.id,
        status: "PENDING" as const,
      })),
    });

    await db.auditLog.create({
      data: {
        action: `Member added: ${nameAmharic} (${nameEnglishFirst}) — $${weeklyDollars}/wk, Wheel #${wheelNumber}`,
        entityType: "Member",
        entityId: member.id,
        after: { nameAmharic, nameEnglishFirst, nameEnglishLast, weeklyAmount, wheelNumber },
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) return { error: `Wheel #${wheelNumber} is already taken.` };
    return { error: "Failed to add member." };
  }

  revalidatePath("/admin/members");
  revalidatePath("/admin");
  redirect("/admin/members");
}

export async function updateMember(
  memberId: string,
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const nameAmharic = (formData.get("nameAmharic") as string)?.trim();
  const nameEnglishFirst = (formData.get("nameEnglishFirst") as string)?.trim() ?? "";
  const nameEnglishLast = (formData.get("nameEnglishLast") as string)?.trim() ?? "";
  const phone = (formData.get("phone") as string)?.trim() || null;
  const weeklyDollars = parseFloat(formData.get("weeklyAmount") as string);
  const wheelNumber = parseInt(formData.get("wheelNumber") as string, 10);
  const extraWheelRaw = (formData.get("extraWheelNumber") as string)?.trim();
  const extraWheelNumber = extraWheelRaw ? parseInt(extraWheelRaw, 10) : null;
  const displayPreference = (formData.get("displayPreference") as string) === "ENGLISH" ? "ENGLISH" : "AMHARIC";

  if (!nameAmharic || isNaN(weeklyDollars) || isNaN(wheelNumber)) {
    return { error: "Amharic name, weekly amount, and wheel number are required." };
  }
  if (nameAmharic.length < 2) return { error: "Amharic name must be at least 2 characters." };
  if (weeklyDollars < 1) return { error: "Weekly amount must be at least $1." };
  if (wheelNumber < 1) return { error: "Wheel number must be a positive number." };
  if (extraWheelNumber !== null && (isNaN(extraWheelNumber) || extraWheelNumber < 1)) {
    return { error: "Extra wheel number must be a positive number." };
  }

  const weeklyAmount = Math.round(weeklyDollars * 100);

  const before = await db.member.findUnique({ where: { id: memberId } });
  if (!before) return { error: "Member not found." };

  try {
    await db.member.update({
      where: { id: memberId },
      data: { nameAmharic, nameEnglishFirst, nameEnglishLast, phone, weeklyAmount, wheelNumber, extraWheelNumber, displayPreference },
    });

    await db.auditLog.create({
      data: {
        action: `Member updated: ${nameAmharic} (${nameEnglishFirst})`,
        entityType: "Member",
        entityId: memberId,
        before: {
          nameAmharic: before.nameAmharic,
          nameEnglishFirst: before.nameEnglishFirst,
          weeklyAmount: before.weeklyAmount,
          wheelNumber: before.wheelNumber,
          displayPreference: before.displayPreference,
        },
        after: { nameAmharic, nameEnglishFirst, weeklyAmount, wheelNumber, displayPreference },
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) return { error: "That wheel number is already taken by another member." };
    return { error: "Failed to update member." };
  }

  revalidatePath("/admin/members");
  revalidatePath("/admin");
  redirect("/admin/members");
}

export async function deleteMember(memberId: string): Promise<void> {
  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member) return;

  await db.member.delete({ where: { id: memberId } });

  await db.auditLog.create({
    data: {
      action: `Member removed: ${member.nameAmharic} (${member.nameEnglishFirst})`,
      entityType: "Member",
      entityId: memberId,
      before: {
        nameAmharic: member.nameAmharic,
        weeklyAmount: member.weeklyAmount,
        wheelNumber: member.wheelNumber,
      },
    },
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin");
}

export async function suspendFromWheel(memberId: string): Promise<void> {
  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member) return;

  await db.member.update({ where: { id: memberId }, data: { wheelSuspended: true } });

  await db.auditLog.create({
    data: {
      action: `Wheel suspended: ${member.nameAmharic} (${member.nameEnglishFirst}) — removed from spin draw`,
      entityType: "Member",
      entityId: memberId,
      before: { wheelSuspended: false },
      after: { wheelSuspended: true },
    },
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin");
}

export async function reinstateToWheel(memberId: string): Promise<void> {
  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member) return;

  await db.member.update({ where: { id: memberId }, data: { wheelSuspended: false } });

  await db.auditLog.create({
    data: {
      action: `Wheel reinstated: ${member.nameAmharic} (${member.nameEnglishFirst}) — restored to spin draw`,
      entityType: "Member",
      entityId: memberId,
      before: { wheelSuspended: true },
      after: { wheelSuspended: false },
    },
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin");
}

export async function updateDisplayPreference(
  token: string,
  preference: "AMHARIC" | "ENGLISH"
): Promise<void> {
  const member = await db.member.findUnique({ where: { token } });
  if (!member) return;

  await db.member.update({
    where: { token },
    data: { displayPreference: preference },
  });

  revalidatePath(`/m/${token}`);
}

export async function confirmAgreement(
  token: string,
  client: ClientFingerprint
): Promise<void> {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";
  const userAgent = headersList.get("user-agent") ?? "";

  const member = await db.member.findUnique({ where: { token } });
  if (!member || member.confirmedAt) return;

  const fingerprint = buildFingerprint(userAgent, client, token);

  await db.member.update({
    where: { token },
    data: {
      confirmedAt: new Date(),
      confirmedIp: ip,
      confirmedFingerprint: fingerprint as object,
    },
  });

  await db.auditLog.create({
    data: {
      action: `Member confirmed agreement: ${member.nameAmharic} (IP: ${ip}, ${fingerprint.browser} on ${fingerprint.os})`,
      entityType: "Member",
      entityId: member.id,
      after: { confirmedAt: new Date().toISOString(), ip, fingerprint },
    },
  });

  revalidatePath(`/m/${token}`);
  revalidatePath("/admin/members");
}

export async function confirmCollectionReceipt(
  token: string,
  wheelType: "main" | "extra" = "main",
  client: ClientFingerprint = { screen: "unknown", language: "unknown" }
): Promise<{ error?: string }> {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";
  const userAgent = headersList.get("user-agent") ?? "";

  const member = await db.member.findUnique({ where: { token } });
  if (!member) return { error: "Member not found" };

  const fingerprint = buildFingerprint(userAgent, client, token);

  if (wheelType === "extra") {
    if (member.collectionConfirmedAtExtra) return {};
    await db.member.update({
      where: { token },
      data: {
        collectionConfirmedAtExtra: new Date(),
        collectionConfirmedIpExtra: ip,
        collectionConfirmedFingerprintExtra: fingerprint as object,
      },
    });
    await db.auditLog.create({
      data: {
        action: `Member confirmed extra wheel collection receipt: ${member.nameAmharic} (IP: ${ip}, ${fingerprint.browser} on ${fingerprint.os})`,
        entityType: "Member",
        entityId: member.id,
        after: { collectionConfirmedAtExtra: new Date().toISOString(), ip, fingerprint },
      },
    });
  } else {
    if (member.collectionConfirmedAt) return {};
    await db.member.update({
      where: { token },
      data: {
        collectionConfirmedAt: new Date(),
        collectionConfirmedIp: ip,
        collectionConfirmedFingerprint: fingerprint as object,
      },
    });
    await db.auditLog.create({
      data: {
        action: `Member confirmed collection receipt: ${member.nameAmharic} (IP: ${ip}, ${fingerprint.browser} on ${fingerprint.os})`,
        entityType: "Member",
        entityId: member.id,
        after: { collectionConfirmedAt: new Date().toISOString(), ip, fingerprint },
      },
    });
  }

  revalidatePath(`/m/${token}`);
  revalidatePath("/admin/members");
  return {};
}

export async function regenerateToken(memberId: string): Promise<void> {
  const newToken = randomUUID();
  await db.member.update({
    where: { id: memberId },
    data: { token: newToken },
  });

  await db.auditLog.create({
    data: {
      action: `Member link regenerated`,
      entityType: "Member",
      entityId: memberId,
    },
  });

  revalidatePath("/admin/members");
}
