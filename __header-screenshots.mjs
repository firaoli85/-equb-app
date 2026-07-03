/**
 * Header redesign screenshots — member home at 390px, light + dark.
 */
import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "ui-header");
await mkdir(OUT, { recursive: true });

const BASE = "http://localhost:3002";
const db = new PrismaClient();

function computeFingerprint(ua, screen, language) {
  return crypto.createHash("sha256").update(`${ua}|${screen}|${language}`).digest("hex");
}

const member = await db.member.findFirst({
  where: { confirmedAt: { not: null }, isArchived: false, pin: { not: null } },
  select: { id: true, token: true, nameEnglishFirst: true },
});
if (!member) { console.error("No confirmed member found"); await db.$disconnect(); process.exit(1); }
console.log(`Using member: ${member.nameEnglishFirst}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
await page.setViewportSize({ width: 390, height: 844 });

const ua = await page.evaluate(() => navigator.userAgent);
const SCREEN = "390x844";
const LANG = "en-US";
const fingerprint = computeFingerprint(ua, SCREEN, LANG);

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
  { name: "equb_device_hint",    value: `${SCREEN}|${LANG}`,  domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
]);

const ROUTE = `/m/${member.token}`;
await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });
// Wait for ring animation to start/complete
await page.waitForTimeout(1200);

// Light
await page.evaluate(() => document.documentElement.classList.remove("dark"));
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(OUT, "member-home--light--390.png"), fullPage: false });
console.log("✓ member-home--light--390.png");

// Dark
await page.evaluate(() => document.documentElement.classList.add("dark"));
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, "member-home--dark--390.png"), fullPage: false });
console.log("✓ member-home--dark--390.png");

await db.memberSession.delete({ where: { sessionToken: session.sessionToken } }).catch(() => {});
await browser.close();
await db.$disconnect();
console.log("\n✅ Screenshots saved to ui-header/");
