/**
 * Pass 1 polish screenshots — member home at 390px, light + dark.
 * Pulls member token directly from DB — no admin login needed.
 */
import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "ui-pass1");
await mkdir(OUT, { recursive: true });

const BASE = "http://localhost:3002";
const db = new PrismaClient();

function computeFingerprint(ua, screen, language) {
  const data = `${ua}|${screen}|${language}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

// Get any confirmed, non-archived member with a PIN
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

// Discover playwright's UA
const ua = await page.evaluate(() => navigator.userAgent);
const SCREEN = "390x844";
const LANG = "en-US";
const fingerprint = computeFingerprint(ua, SCREEN, LANG);

// Create temp session
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
await page.waitForTimeout(500);

// Light
await page.evaluate(() => document.documentElement.classList.remove("dark"));
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(OUT, "member-home--light--390.png"), fullPage: true });
console.log("✓ member-home--light--390.png");

// Dark
await page.evaluate(() => document.documentElement.classList.add("dark"));
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, "member-home--dark--390.png"), fullPage: true });
console.log("✓ member-home--dark--390.png");

await db.memberSession.delete({ where: { sessionToken: session.sessionToken } }).catch(() => {});
await browser.close();
await db.$disconnect();
console.log("\n✅ Screenshots saved to ui-pass1/");
