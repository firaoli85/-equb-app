// Viewport-only screenshots (fullPage: false) of the member Collections page.
// Light + dark at 390px width, saved to ./ui-collections-after/.

import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "ui-collections-after");
await mkdir(OUT, { recursive: true });

const BASE = "http://localhost:3000";
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
console.log(`Using: ${member.nameEnglishFirst}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
await page.setViewportSize({ width: 390, height: 844 });

const ua = await page.evaluate(() => navigator.userAgent);
const fingerprint = crypto
  .createHash("sha256")
  .update(`${ua}|390x844|en-US`)
  .digest("hex");

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
  {
    name: "equb_member_session",
    value: session.sessionToken,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  },
  {
    name: "equb_device_hint",
    value: "390x844|en-US",
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  },
]);

await page.goto(`${BASE}/m/${member.token}/collections`, {
  waitUntil: "networkidle",
});
await page.waitForTimeout(600);

async function takeShots(theme) {
  if (theme === "light") {
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
  } else {
    await page.evaluate(() => document.documentElement.classList.add("dark"));
  }
  await page.waitForTimeout(150);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({
    path: path.join(OUT, `collections--${theme}--top.png`),
    fullPage: false,
  });
  console.log(`✓ ${theme} top`);

  const midY = await page.evaluate(() =>
    Math.floor(document.body.scrollHeight / 2)
  );
  if (midY > 0) {
    await page.evaluate((y) => window.scrollTo(0, y), midY);
    await page.waitForTimeout(120);
    await page.screenshot({
      path: path.join(OUT, `collections--${theme}--middle.png`),
      fullPage: false,
    });
    console.log(`✓ ${theme} middle (scrolled to ${midY}px)`);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(120);
  await page.screenshot({
    path: path.join(OUT, `collections--${theme}--bottom.png`),
    fullPage: false,
  });
  console.log(`✓ ${theme} bottom`);
}

await takeShots("light");
await takeShots("dark");

await db.memberSession
  .delete({ where: { sessionToken: session.sessionToken } })
  .catch(() => {});
await browser.close();
await db.$disconnect();
console.log(
  "✅ Saved to ui-collections-after/  (all fullPage: false — nav pinned to bottom)"
);
