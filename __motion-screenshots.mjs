// Viewport screenshots of the member portal at 390px for the motion pass.
// Captures: home, payments, schedule, collections pages in light + dark.

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

const PAGES = [
  { name: "home",        suffix: ""             },
  { name: "payments",   suffix: "/payments"    },
  { name: "schedule",   suffix: "/weeks"       },
  { name: "collections",suffix: "/collections" },
];

for (const theme of ["light", "dark"]) {
  for (const pg of PAGES) {
    await page.goto(`${BASE}/m/${member.token}${pg.suffix}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);

    if (theme === "dark") {
      await page.evaluate(() => document.documentElement.classList.add("dark"));
    } else {
      await page.evaluate(() => document.documentElement.classList.remove("dark"));
    }
    await page.waitForTimeout(150);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);

    const file = path.join(OUT, `${pg.name}--${theme}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`✓ ${theme} ${pg.name}`);
  }
}

await db.memberSession
  .delete({ where: { sessionToken: session.sessionToken } })
  .catch(() => {});
await browser.close();
await db.$disconnect();
console.log("✅ Saved to ui-motion/");
