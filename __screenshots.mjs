/**
 * Full-page screenshot capture script.
 * Logs into admin via the login UI.
 * For the member portal: creates a temporary MemberSession in the DB keyed to the
 * playwright browser's actual UA + fixed screen/language, then injects the cookies.
 * No credentials are printed to stdout.
 */
import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "ui-screenshots");
await mkdir(OUT, { recursive: true });

const BASE = "http://localhost:3000";

// Read ADMIN_PASSWORD from .env.local — never echoed to stdout
const envText = await readFile(path.join(__dirname, ".env.local"), "utf8");
const ADMIN_PASSWORD = envText.match(/^ADMIN_PASSWORD="([^"]+)"/m)?.[1];
if (!ADMIN_PASSWORD) { console.error(".env.local missing ADMIN_PASSWORD"); process.exit(1); }

const db = new PrismaClient();

// ── Helper: capture at one viewport width ───────────────────────────────────
async function screenshot(page, name, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForLoadState("networkidle");
  const suffix = width === 1440 ? "desktop" : "mobile";
  const file = path.join(OUT, `${name}--${suffix}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  ✓ ${path.basename(file)}`);
}

const browser = await chromium.launch({ headless: true });

// ── 1. Admin login ───────────────────────────────────────────────────────────
console.log("\n[1/4] Logging in as admin…");
const adminCtx = await browser.newContext({ ignoreHTTPSErrors: true });
const adminPage = await adminCtx.newPage();

await adminPage.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
await adminPage.fill('input[name="password"]', ADMIN_PASSWORD);
await adminPage.click('button[type="submit"]');
await adminPage.waitForURL(`${BASE}/admin`, { timeout: 15000 });
console.log("  ✓ Logged in");

// ── 2. Extract member token from members page ─────────────────────────────────
console.log("\n[2/4] Extracting member token from /admin/members…");
await adminPage.goto(`${BASE}/admin/members`, { waitUntil: "networkidle" });
const memberToken = await adminPage.evaluate(() => {
  const anchors = [...document.querySelectorAll("a[href]")];
  for (const a of anchors) {
    const m = a.href.match(/\/api\/(?:receipt|collection-receipt)\/([a-f0-9-]{36})/i);
    if (m) return m[1];
  }
  return null;
});
if (!memberToken) {
  console.error("  ✗ No member token found"); await browser.close(); await db.$disconnect(); process.exit(1);
}
// Write to file only — never printed to stdout
await writeFile(path.join(OUT, "__member_token.txt"), memberToken, "utf8");
console.log("  ✓ Member token found (saved to file)");

// ── 3. Admin screenshots ──────────────────────────────────────────────────────
console.log("\n[3/4] Capturing admin pages…");
const adminPages = [
  { route: "/admin",            name: "admin--dashboard" },
  { route: "/admin/members",    name: "admin--members" },
  { route: "/admin/payments",   name: "admin--payments" },
  { route: "/admin/weeks",      name: "admin--weeks" },
  { route: "/admin/collection", name: "admin--collection" },
  { route: "/admin/wheel",      name: "admin--wheel" },
  { route: "/admin/reviews",    name: "admin--reviews" },
  { route: "/admin/audit",      name: "admin--audit" },
];
for (const { route, name } of adminPages) {
  console.log(`  → ${route}`);
  await adminPage.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await adminPage.waitForTimeout(800);
  for (const w of [1440, 390]) await screenshot(adminPage, name, w);
}

// ── 4. Member portal — create a temporary session keyed to playwright's UA ──
console.log("\n[4/4] Setting up member session and capturing portal pages…");

// Fresh context so we can control cookies precisely
const memberCtx = await browser.newContext({ ignoreHTTPSErrors: true });
const mPage = await memberCtx.newPage();

// Discover the browser's actual UA
const playwrightUA = await mPage.evaluate(() => navigator.userAgent);
const SCREEN = "1440x900";
const LANG = "en-US";

// Compute fingerprint: SHA-256(ua|screen|language) — matches computeFingerprint() in lib
async function computeFingerprint(ua, screen, language) {
  const data = `${ua}|${screen}|${language}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const fingerprint = await computeFingerprint(playwrightUA, SCREEN, LANG);

// Find the member by their token, get their ID
const member = await db.member.findUnique({
  where: { token: memberToken },
  select: { id: true, nameEnglishFirst: true },
});
if (!member) {
  console.error("  ✗ Member not found in DB"); await browser.close(); await db.$disconnect(); process.exit(1);
}

// Create a temporary MemberSession in the DB (expires in 7 days, same as normal login)
await db.memberSession.deleteMany({ where: { memberId: member.id } }); // clear existing
const now = new Date();
const session = await db.memberSession.create({
  data: {
    memberId: member.id,
    deviceFingerprint: fingerprint,
    lastActiveAt: now,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  },
});

// Inject session cookies into playwright context
await memberCtx.addCookies([
  { name: "equb_member_session", value: session.sessionToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  { name: "equb_device_hint",    value: `${SCREEN}|${LANG}`,  domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
]);
console.log(`  ✓ Session created for ${member.nameEnglishFirst}`);

const memberPages = [
  { route: `/m/${memberToken}`,             name: "member--home" },
  { route: `/m/${memberToken}/payments`,    name: "member--payments" },
  { route: `/m/${memberToken}/collections`, name: "member--collections" },
  { route: "/login",                         name: "member--login" },
];
for (const { route, name } of memberPages) {
  console.log(`  → ${route}`);
  await mPage.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await mPage.waitForTimeout(800);
  for (const w of [1440, 390]) await screenshot(mPage, name, w);
}

// Clean up the temp session we created
await db.memberSession.delete({ where: { sessionToken: session.sessionToken } }).catch(() => {});

await browser.close();
await db.$disconnect();
console.log("\n✅ All screenshots saved to ui-screenshots/");
