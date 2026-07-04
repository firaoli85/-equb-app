import { db } from "@/lib/db";

const MAX_SENDS        = 3;
const SEND_WINDOW_MS   = 15 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_FAILS = 5;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function checkAndRecordSend(
  phone: string
): Promise<{ allowed: boolean; error?: string }> {
  const key = normalizePhone(phone);
  if (key.length < 10) return { allowed: false, error: "Invalid phone number." };

  const now = new Date();
  const record = await db.otpRateLimit.findUnique({ where: { phone: key } });

  if (!record) {
    await db.otpRateLimit.create({
      data: { phone: key, sendCount: 1, windowStart: now, lastSentAt: now },
    });
    return { allowed: true };
  }

  if (record.lastSentAt) {
    const cooldownLeft = SEND_COOLDOWN_MS - (now.getTime() - record.lastSentAt.getTime());
    if (cooldownLeft > 0) {
      const secs = Math.ceil(cooldownLeft / 1000);
      return {
        allowed: false,
        error: `Please wait ${secs} second${secs !== 1 ? "s" : ""} before requesting a new code.`,
      };
    }
  }

  const windowAge = now.getTime() - record.windowStart.getTime();
  if (windowAge >= SEND_WINDOW_MS) {
    await db.otpRateLimit.update({
      where: { phone: key },
      data: { sendCount: 1, windowStart: now, lastSentAt: now },
    });
    return { allowed: true };
  }

  if (record.sendCount >= MAX_SENDS) {
    const waitMins = Math.ceil((SEND_WINDOW_MS - windowAge) / 60_000);
    return {
      allowed: false,
      error: `Too many codes requested. Please wait ${waitMins} minute${waitMins !== 1 ? "s" : ""} before trying again.`,
    };
  }

  await db.otpRateLimit.update({
    where: { phone: key },
    data: { sendCount: { increment: 1 }, lastSentAt: now },
  });
  return { allowed: true };
}

export async function checkVerifyLimit(
  phone: string
): Promise<{ allowed: boolean; error?: string }> {
  const key = normalizePhone(phone);
  const now = new Date();
  const record = await db.otpRateLimit.findUnique({ where: { phone: key } });
  if (!record) return { allowed: true };

  const windowAge = now.getTime() - record.failWindowStart.getTime();
  if (windowAge >= VERIFY_WINDOW_MS) return { allowed: true };
  if (record.failCount >= MAX_VERIFY_FAILS) {
    return { allowed: false, error: "Too many failed attempts. Please request a new code." };
  }
  return { allowed: true };
}

export async function recordVerifyFailure(phone: string): Promise<void> {
  const key = normalizePhone(phone);
  const now = new Date();
  await db.otpRateLimit.upsert({
    where: { phone: key },
    create: { phone: key, sendCount: 0, windowStart: now, failCount: 1, failWindowStart: now },
    update: { failCount: { increment: 1 } },
  });
}

export async function recordVerifySuccess(phone: string): Promise<void> {
  const key = normalizePhone(phone);
  await db.otpRateLimit.updateMany({
    where: { phone: key },
    data: { failCount: 0 },
  });
}
