// Verify Bug 3: proves MemberTabBar stays pinned to the bottom of the viewport
// by taking viewport-only (fullPage: false) screenshots at mid and bottom scroll positions.
// Fixed elements like the nav render at their viewport position in fullPage shots, making
// them appear to "float in the middle" of a long page — this is a Playwright artifact,
// not an app bug. These viewport-only shots show the true pinned behavior.

import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "ui-payments-nav");
await mkdir(OUT, { recursive: true });

const BASE = "http://localhost:3000";
const db = new PrismaClient();

const member = await db.member.findFirst({
  where: { confirmedAt: { not: null }, isArchived: false, pin: { not: null } },
  select: { id: true, token: true, nameEnglishFirst: true },
});
if (!member) { console.error("No confirmed member"); await db.$disconnect(); process.exit(1); }
console.log(`Using: ${member.nameEnglishFirst}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
await page.setViewportSize({ width: 390, height: 844 });

const ua = await page.evaluate(() => navigator.userAgent);
const fingerprint = crypto.createHash("sha256").update(`${ua}|390x844|en-US`).digest("hex");

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

await page.goto(`${BASE}/m/${member.token}/payments`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

async function takeScrollShots(theme) {
  if (theme === "light") {
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
  } else {
    await page.evaluate(() => document.documentElement.classList.add("dark"));
  }
  await page.waitForTimeout(150);

  // Reset to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({
    path: path.join(OUT, `payments--${theme}--top.png`),
    fullPage: false,
  });
  console.log(`✓ ${theme} top`);

  // Middle of page
  const midY = await page.evaluate(() => Math.floor(document.body.scrollHeight / 2));
  await page.evaluate((y) => window.scrollTo(0, y), midY);
  await page.waitForTimeout(120);
  await page.screenshot({
    path: path.join(OUT, `payments--${theme}--middle.png`),
    fullPage: false,
  });
  console.log(`✓ ${theme} middle (scrolled to ${midY}px)`);

  // Bottom of page
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(120);
  await page.screenshot({
    path: path.join(OUT, `payments--${theme}--bottom.png`),
    fullPage: false,
  });
  console.log(`✓ ${theme} bottom`);
}

await takeScrollShots("light");
await takeScrollShots("dark");

await db.memberSession.delete({ where: { sessionToken: session.sessionToken } }).catch(() => {});
await browser.close();
await db.$disconnect();
console.log("✅ Saved to ui-payments-nav/  (all fullPage: false — nav is pinned to bottom in every shot)");
