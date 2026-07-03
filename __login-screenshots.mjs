// Viewport-only screenshots of /login Step 1 and Step 2
// Light + dark at 390px into ./ui-login-after/

import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "ui-login-after");
await mkdir(OUT, { recursive: true });

const BASE = "http://localhost:3001";
const db = new PrismaClient();

// Grab a confirmed member's phone so we can trigger step 2
const member = await db.member.findFirst({
  where: { confirmedAt: { not: null }, isArchived: false, phone: { not: null }, pin: { not: null } },
  select: { phone: true, nameEnglishFirst: true },
});
if (!member?.phone) {
  console.error("No confirmed member with phone found");
  await db.$disconnect();
  process.exit(1);
}
console.log(`Member: ${member.nameEnglishFirst}, phone: ${member.phone}`);

// Normalize to 10-digit format for the input
const digits = member.phone.replace(/\D/g, "");
const last10 = digits.slice(-10);
const phoneInput = `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
console.log(`Phone input: ${phoneInput}`);

const browser = await chromium.launch({ headless: true });

async function takeShots(theme) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  // ── Step 1 screenshot ──────────────────────────────────────────────────

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  if (theme === "dark") {
    await page.evaluate(() => document.documentElement.classList.add("dark"));
  } else {
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
  }
  await page.waitForTimeout(150);

  await page.screenshot({
    path: path.join(OUT, `login--step1--${theme}.png`),
    fullPage: false,
  });
  console.log(`✓ ${theme} step 1`);

  // ── Step 2 screenshot — submit phone to reveal method picker ──────────

  // Fill and submit the phone form
  const phoneField = page.locator('input[name="phone"]');
  await phoneField.fill(phoneInput);

  // Submit and wait for step 2 to appear (the method picker)
  await page.locator('button[type="submit"]').click();

  // Wait for any of the method buttons to appear (indicates step 2 is live)
  try {
    await page.waitForSelector('button:has-text("Enter my PIN")', { timeout: 8000 });
  } catch {
    // Try alternate selector if text differs
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(OUT, `login--step2--${theme}.png`),
    fullPage: false,
  });
  console.log(`✓ ${theme} step 2`);

  await ctx.close();
}

await takeShots("light");
await takeShots("dark");

await browser.close();
await db.$disconnect();
console.log("✅ Saved to ui-login-after/");
