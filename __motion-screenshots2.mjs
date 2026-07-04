// Focused screenshots: collections page + payments page with long wait.

import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "ui-motion");
await mkdir(OUT, { recursive: true });

const BASE = "http://localhost:3001";
const db = new PrismaClient();

const member = await db.member.findFirst({
  where: { confirmedAt: { not: null }, isArchived: false, pin: { not: null } },
  select: { id: true, token: true, nameEnglishFirst: true },
});
if (!member) {
  console.error("No confirmed member found");
  await db.$disconnect();
  process.exit(1);
}
console.log(`Using: ${member.nameEnglishFirst} / token: ${member.token}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
await page.setViewportSize({ width: 390, height: 844 });

const ua = await page.evaluate(() => navigator.userAgent);
const fingerprint = crypto
  .createHash("sha256")
  .update(`${ua}|390x844|en-US`)
  .digest("hex");

// Create fresh session
await db.memberSession.deleteMany({ where: { memberId: member.id } });
const now = new Date();
const session = await db.memberSession.create({
  data: {
    memberId: member.id,
    deviceFingerprint: fingerprint,
    lastActiveAt: now,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  },
});
await ctx.addCookies([
  { name: "equb_member_session", value: session.sessionToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  { name: "equb_device_hint", value: "390x844|en-US", domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
]);

// ── Payments page (light) — stagger rows ──────────────────────────────────────
await page.goto(`${BASE}/m/${member.token}/payments`, { waitUntil: "networkidle" });
// Wait for React to hydrate + spring animations to fully settle (springs.gentle ~600ms + max delay 0.56s = ~1.2s)
await page.waitForTimeout(2000);
await page.evaluate(() => { document.documentElement.classList.remove("dark"); });
await page.waitForTimeout(100);
await page.screenshot({ path: path.join(OUT, "payments--light.png"), fullPage: false });
console.log("✓ payments light");

// ── Collections page dark — investigate error ─────────────────────────────────
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

await page.goto(`${BASE}/m/${member.token}/collections`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.evaluate(() => { document.documentElement.classList.add("dark"); });
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, "collections--dark.png"), fullPage: false });
console.log("✓ collections dark");
if (errors.length) {
  console.log("Page errors:", errors.join("\n"));
}

await db.memberSession.delete({ where: { sessionToken: session.sessionToken } }).catch(() => {});
await browser.close();
await db.$disconnect();
console.log("✅ Done");
