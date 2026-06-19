"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { buildFingerprint, type ClientFingerprint } from "@/lib/fingerprint";
import { hashPin } from "@/lib/pin";
import { requireAdmin } from "@/lib/auth";

export async function createMember(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const nameAmharic = (formData.get("nameAmharic") as string)?.trim();
  const nameEnglishFirst = (formData.get("nameEnglishFirst") as string)?.trim() ?? "";
  const nameEnglishLast = (formData.get("nameEnglishLast") as string)?.trim() ?? "";
  const phone = (formData.get("phone") as string)?.trim() || null;
  const pinRaw = (formData.get("pin") as string)?.trim() ?? "";
  const weeklyDollars = parseFloat(formData.get("weeklyAmount") as string);
  const wheelNumber = parseInt(formData.get("wheelNumber") as string, 10);
  const extraWheelRaw = (formData.get("extraWheelNumber") as string)?.trim();
  const extraWheelNumber = extraWheelRaw ? parseInt(extraWheelRaw, 10) : null;

  if (!nameAmharic || isNaN(weeklyDollars) || isNaN(wheelNumber)) {
    return { error: "Amharic name, weekly amount, and lucky number are required." };
  }
  if (!/^\d{4}$/.test(pinRaw)) return { error: "PIN is required and must be exactly 4 digits." };
  if (nameAmharic.length < 2) return { error: "Amharic name must be at least 2 characters." };
  if (weeklyDollars < 1) return { error: "Weekly amount must be at least $1." };
  if (wheelNumber < 1) return { error: "Lucky number must be a positive number." };
  if (extraWheelNumber !== null && (isNaN(extraWheelNumber) || extraWheelNumber < 1)) {
    return { error: "Extra lucky number must be a positive number." };
  }

  const weeklyAmount = Math.round(weeklyDollars * 100);

  // Check uniqueness against active members only (partial DB index)
  const wheelTaken = await db.member.findFirst({ where: { wheelNumber, isArchived: false } });
  if (wheelTaken) return { error: `Lucky #${wheelNumber} is already taken.` };
  if (extraWheelNumber !== null) {
    const extraTaken = await db.member.findFirst({ where: { extraWheelNumber, isArchived: false } });
    if (extraTaken) return { error: `Extra lucky #${extraWheelNumber} is already taken.` };
  }

  try {
    const weeks = await db.week.findMany({ orderBy: { weekNumber: "asc" } });
    if (weeks.length === 0) return { error: "Weeks not initialized. Reload the page and try again." };

    const hashedPin = await hashPin(pinRaw);
    const member = await db.member.create({
      data: { nameAmharic, nameEnglishFirst, nameEnglishLast, phone, weeklyAmount, wheelNumber, extraWheelNumber, pin: hashedPin },
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
        action: `Member added: ${nameAmharic} (${nameEnglishFirst}) — $${weeklyDollars}/wk, Lucky #${wheelNumber}`,
        entityType: "Member",
        entityId: member.id,
        after: { nameAmharic, nameEnglishFirst, nameEnglishLast, weeklyAmount, wheelNumber },
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) return { error: `Lucky #${wheelNumber} is already taken.` };
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
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const nameAmharic = (formData.get("nameAmharic") as string)?.trim();
  const nameEnglishFirst = (formData.get("nameEnglishFirst") as string)?.trim() ?? "";
  const nameEnglishLast = (formData.get("nameEnglishLast") as string)?.trim() ?? "";
  const phone = (formData.get("phone") as string)?.trim() || null;
  const weeklyDollars = parseFloat(formData.get("weeklyAmount") as string);
  const wheelNumber = parseInt(formData.get("wheelNumber") as string, 10);
  const extraWheelRaw = (formData.get("extraWheelNumber") as string)?.trim();
  const extraWheelNumber = extraWheelRaw ? parseInt(extraWheelRaw, 10) : null;
  const displayPreference = (formData.get("displayPreference") as string) === "ENGLISH" ? "ENGLISH" : "AMHARIC";
  const pinRaw = (formData.get("pin") as string)?.trim();

  if (!nameAmharic || isNaN(weeklyDollars) || isNaN(wheelNumber)) {
    return { error: "Amharic name, weekly amount, and lucky number are required." };
  }
  if (nameAmharic.length < 2) return { error: "Amharic name must be at least 2 characters." };
  if (weeklyDollars < 1) return { error: "Weekly amount must be at least $1." };
  if (wheelNumber < 1) return { error: "Lucky number must be a positive number." };
  if (extraWheelNumber !== null && (isNaN(extraWheelNumber) || extraWheelNumber < 1)) {
    return { error: "Extra lucky number must be a positive number." };
  }
  if (pinRaw && !/^\d{4}$/.test(pinRaw)) {
    return { error: "PIN must be exactly 4 digits." };
  }

  const weeklyAmount = Math.round(weeklyDollars * 100);

  const before = await db.member.findUnique({ where: { id: memberId } });
  if (!before) return { error: "Member not found." };

  // Guard: a lucky number that has already been drawn cannot be changed — doing so
  // would break the collection PDF (receipt route looks up WeekPayout by member.wheelNumber).
  if (wheelNumber !== before.wheelNumber) {
    const mainDrawn = await db.weekPayout.findFirst({
      where: { number: before.wheelNumber },
      select: { id: true },
    });
    if (mainDrawn) {
      return {
        error: `Lucky #${before.wheelNumber} has already been drawn and cannot be changed. Won numbers are locked to preserve the payout record.`,
      };
    }
  }
  const extraChanging = extraWheelNumber !== before.extraWheelNumber;
  if (extraChanging && before.extraWheelNumber != null) {
    const extraDrawn = await db.weekPayout.findFirst({
      where: { number: before.extraWheelNumber },
      select: { id: true },
    });
    if (extraDrawn) {
      return {
        error: `Extra lucky #${before.extraWheelNumber} has already been drawn and cannot be changed. Won numbers are locked to preserve the payout record.`,
      };
    }
  }

  // Check uniqueness — exclude this member itself and archived members
  const wheelTakenByOther = await db.member.findFirst({
    where: { wheelNumber, isArchived: false, id: { not: memberId } },
  });
  if (wheelTakenByOther) return { error: "That lucky number is already taken by another active member." };
  if (extraWheelNumber !== null) {
    const extraTakenByOther = await db.member.findFirst({
      where: { extraWheelNumber, isArchived: false, id: { not: memberId } },
    });
    if (extraTakenByOther) return { error: "That extra lucky number is already taken by another active member." };
  }

  const mainChanging = wheelNumber !== before.wheelNumber;
  const pinHash = pinRaw ? await hashPin(pinRaw) : undefined;

  try {
    await db.$transaction(async (tx) => {
      // ── Member update ──────────────────────────────────────────────────────
      await tx.member.update({
        where: { id: memberId },
        data: {
          nameAmharic, nameEnglishFirst, nameEnglishLast, phone,
          weeklyAmount, wheelNumber, extraWheelNumber, displayPreference,
          ...(pinHash !== undefined ? { pin: pinHash, pinAttempts: 0, pinLockedUntil: null } : {}),
        },
      });

      // ── WheelSlot cascade: replace old lucky number with new in-place ──────
      // Only undrawn numbers reach here — won numbers are blocked by the Part 1 guard above.
      const slotChanges: string[] = [];

      if (mainChanging) {
        const slot = await tx.wheelSlot.findFirst({
          where: { numbers: { has: before.wheelNumber } },
        });
        if (slot) {
          const conflict = await tx.wheelSlot.findFirst({
            where: { numbers: { has: wheelNumber }, id: { not: slot.id } },
          });
          if (conflict) {
            throw new Error(
              `Lucky #${wheelNumber} already exists in another wheel slot — cannot auto-place.`
            );
          }
          await tx.wheelSlot.update({
            where: { id: slot.id },
            data: { numbers: slot.numbers.map((n) => (n === before.wheelNumber ? wheelNumber : n)) },
          });
          slotChanges.push(`#${before.wheelNumber} → #${wheelNumber} (slot ${slot.position})`);
        }
        // Old number was not in any slot → new number stays unassigned; Wheel Setup banner will show it.
      }

      if (extraChanging && before.extraWheelNumber != null) {
        const oldExtra = before.extraWheelNumber;
        const slot = await tx.wheelSlot.findFirst({
          where: { numbers: { has: oldExtra } },
        });
        if (slot) {
          if (extraWheelNumber != null) {
            // Number-to-number: replace in place
            const conflict = await tx.wheelSlot.findFirst({
              where: { numbers: { has: extraWheelNumber }, id: { not: slot.id } },
            });
            if (conflict) {
              throw new Error(
                `Extra lucky #${extraWheelNumber} already exists in another wheel slot — cannot auto-place.`
              );
            }
            await tx.wheelSlot.update({
              where: { id: slot.id },
              data: { numbers: slot.numbers.map((n) => (n === oldExtra ? extraWheelNumber : n)) },
            });
            slotChanges.push(`extra #${oldExtra} → #${extraWheelNumber} (slot ${slot.position})`);
          } else {
            // Number-to-null (extra removed): drop old number from slot
            await tx.wheelSlot.update({
              where: { id: slot.id },
              data: { numbers: slot.numbers.filter((n) => n !== oldExtra) },
            });
            slotChanges.push(`extra #${oldExtra} removed from slot ${slot.position}`);
          }
        }
        // Old extra was not in any slot → nothing to update
      }

      // ── Audit log ──────────────────────────────────────────────────────────
      const slotNote = slotChanges.length > 0
        ? ` Slot updated: ${slotChanges.join("; ")}.`
        : "";
      await tx.auditLog.create({
        data: {
          action: `Member updated: ${nameAmharic} (${nameEnglishFirst}).${slotNote}`,
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
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "Failed to update member." };
  }

  revalidatePath("/admin/members");
  revalidatePath("/admin");
  redirect("/admin/members");
}

export async function deleteMember(memberId: string): Promise<void> {
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error(auth.error);

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
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error(auth.error);

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member) return;

  await db.member.update({ where: { id: memberId }, data: { wheelSuspended: true } });

  await db.auditLog.create({
    data: {
      action: `Draw suspended: ${member.nameAmharic} (${member.nameEnglishFirst}) — removed from spin draw`,
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
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error(auth.error);

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

  const dbWheelType = wheelType === "extra" ? "EXTRA" : "MAIN";
  const now = new Date();

  if (wheelType === "extra") {
    if (member.collectionConfirmedAtExtra) return {};
    await db.member.update({
      where: { token },
      data: {
        collectionConfirmedAtExtra: now,
        collectionConfirmedIpExtra: ip,
        collectionConfirmedFingerprintExtra: fingerprint as object,
      },
    });
  } else {
    if (member.collectionConfirmedAt) return {};
    await db.member.update({
      where: { token },
      data: {
        collectionConfirmedAt: now,
        collectionConfirmedIp: ip,
        collectionConfirmedFingerprint: fingerprint as object,
      },
    });
  }

  // Stamp WeekPayout.signedAt so admin tracking shows "signed" per number.
  // Idempotent: if already signed, update is a no-op in practice.
  const payout = await db.weekPayout.findFirst({
    where: { memberId: member.id, wheelType: dbWheelType },
    include: { week: { select: { weekNumber: true } } },
  });
  if (payout) {
    await db.weekPayout.update({
      where: { id: payout.id },
      data: { signedAt: now },
    });
  }

  const numLabel = wheelType === "extra"
    ? `Lucky #${member.extraWheelNumber ?? "?"}`
    : `Lucky #${member.wheelNumber}`;
  const weekLabel = payout ? ` (Week ${payout.week.weekNumber})` : "";

  await db.auditLog.create({
    data: {
      action: `Member signed collection receipt: ${member.nameAmharic} — ${numLabel}${weekLabel} (IP: ${ip}, ${fingerprint.browser} on ${fingerprint.os})`,
      entityType: "Member",
      entityId: member.id,
      after: {
        [wheelType === "extra" ? "collectionConfirmedAtExtra" : "collectionConfirmedAt"]: now.toISOString(),
        ip,
        fingerprint,
        ...(payout ? { weekPayoutId: payout.id, signedAt: now.toISOString() } : {}),
      },
    },
  });

  revalidatePath(`/m/${token}`);
  revalidatePath("/admin/members");
  return {};
}

export async function replaceMember(
  oldMemberId: string,
  _prevState: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const nameAmharic = (formData.get("nameAmharic") as string)?.trim();
  const nameEnglishFirst = (formData.get("nameEnglishFirst") as string)?.trim() ?? "";
  const nameEnglishLast = (formData.get("nameEnglishLast") as string)?.trim() ?? "";
  const phone = (formData.get("phone") as string)?.trim() || null;

  if (!nameAmharic || nameAmharic.length < 2) {
    return { error: "Amharic name is required (min 2 characters)." };
  }

  const oldMember = await db.member.findUnique({
    where: { id: oldMemberId },
    include: { payments: true },
  });
  if (!oldMember || oldMember.isArchived) return { error: "Member not found." };

  // Archive old member
  await db.member.update({
    where: { id: oldMemberId },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      archivedReason: `Replaced by ${nameAmharic}${nameEnglishFirst ? ` (${nameEnglishFirst})` : ""}`,
    },
  });

  // Create replacement member
  const newMember = await db.member.create({
    data: {
      nameAmharic,
      nameEnglishFirst,
      nameEnglishLast,
      phone,
      weeklyAmount: oldMember.weeklyAmount,
      wheelNumber: oldMember.wheelNumber,
      extraWheelNumber: oldMember.extraWheelNumber,
    },
  });

  // Copy payment statuses from old member to new member for all weeks,
  // but reset weeks where the old member won the pot to PENDING for the new member.
  // "Won" weeks are identified via the old member's WeekPayout rows (source of truth,
  // includes secondary winners whose number was not the week's winnerWheelNumber).
  // Also include any approved WON review requests for the old member.
  const [allWeeks, wonPayouts, wonReviews] = await Promise.all([
    db.week.findMany({ select: { id: true } }),
    db.weekPayout.findMany({
      where: { memberId: oldMemberId },
      select: { weekId: true },
    }),
    db.paymentReviewRequest.findMany({
      where: { memberId: oldMemberId, claimedStatus: "WON", status: "APPROVED" },
      select: { weekId: true },
    }),
  ]);

  const wonWeekIds = new Set<string>([
    ...wonPayouts.map((p) => p.weekId),
    ...wonReviews.map((r) => r.weekId),
  ]);

  const oldPaymentMap = new Map(oldMember.payments.map((p) => [p.weekId, p]));

  await db.payment.createMany({
    data: allWeeks.map((w) => {
      const prev = oldPaymentMap.get(w.id);
      const isWonWeek = wonWeekIds.has(w.id);
      // Won weeks stay PENDING — the new member still owes those contributions
      // and has not received the payout, so don't inherit the old member's status.
      return {
        memberId: newMember.id,
        weekId: w.id,
        status: isWonWeek ? "PENDING" : (prev?.status ?? "PENDING"),
        method: isWonWeek ? null : (prev?.method ?? null),
        paidAt: isWonWeek ? null : (prev?.paidAt ?? null),
        notes: isWonWeek ? null : (prev?.notes ?? null),
      };
    }),
  });

  await db.auditLog.create({
    data: {
      action: `Member replaced: ${oldMember.nameAmharic} → ${nameAmharic} (Lucky #${oldMember.wheelNumber})`,
      entityType: "Member",
      entityId: newMember.id,
      before: { nameAmharic: oldMember.nameAmharic, wheelNumber: oldMember.wheelNumber },
      after: { nameAmharic, wheelNumber: oldMember.wheelNumber },
    },
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  return { success: true };
}

export async function deleteAllMembers(): Promise<void> {
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error(auth.error);

  // Audit logs have no FK to members — clear them manually first
  await db.auditLog.deleteMany({});
  // Cascade on Member → Payment and Member → PaymentReviewRequest handles the rest
  await db.member.deleteMany({});

  revalidatePath("/admin/members");
  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/collection");
  redirect("/admin/members");
}

export async function permanentlyDeleteArchivedMember(memberId: string): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member) return { error: "Member not found." };
  if (!member.isArchived) return { error: "Only archived members can be permanently deleted." };

  await db.member.delete({ where: { id: memberId } });

  await db.auditLog.create({
    data: {
      action: `Archived member permanently deleted: ${member.nameAmharic} (Lucky #${member.wheelNumber})`,
      entityType: "Member",
      entityId: memberId,
      before: { nameAmharic: member.nameAmharic, wheelNumber: member.wheelNumber },
    },
  });

  revalidatePath("/admin/members");
  return {};
}

export async function regenerateToken(memberId: string): Promise<void> {
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error(auth.error);

  const newToken = randomUUID();
  await db.$transaction([
    db.member.update({ where: { id: memberId }, data: { token: newToken } }),
    db.memberSession.deleteMany({ where: { memberId } }),
  ]);

  await db.auditLog.create({
    data: {
      action: `Member link rotated — old link invalidated, all active sessions signed out`,
      entityType: "Member",
      entityId: memberId,
    },
  });

  revalidatePath("/admin/members");
}
