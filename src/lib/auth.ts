import { cookies } from "next/headers";

const SESSION_COOKIE = "equb_session";
const SESSION_DATA_PREFIX = "equb-admin-v1:";
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SESSION_SECRET!;
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(Math.floor(hex.length / 2));
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Token format: "<hmac-hex>.<issuedAt-ms>"
// HMAC is computed over "equb-admin-v1:<issuedAt-ms>"
export async function createSessionToken(): Promise<string> {
  const issuedAt = Date.now();
  const payload = `${SESSION_DATA_PREFIX}${issuedAt}`;
  const key = await getKey();
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return `${toHex(sig)}.${issuedAt}`;
}

export async function validateSessionToken(token: string): Promise<boolean> {
  try {
    const dotIdx = token.indexOf(".");
    if (dotIdx === -1) return false;
    const hmacHex = token.slice(0, dotIdx);
    const issuedAt = parseInt(token.slice(dotIdx + 1), 10);
    if (isNaN(issuedAt)) return false;

    if (Date.now() - issuedAt > IDLE_TIMEOUT_MS) return false;

    const payload = `${SESSION_DATA_PREFIX}${issuedAt}`;
    const key = await getKey();
    const enc = new TextEncoder();
    return await crypto.subtle.verify("HMAC", key, fromHex(hmacHex), enc.encode(payload));
  } catch {
    return false;
  }
}

// Reusable admin session guard for server actions.
// Reads the same session cookie the (protected) layout validates.
// Returns { ok: true } for authenticated admins; { ok: false, error } otherwise.
export async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !(await validateSessionToken(token))) {
    return { ok: false, error: "Unauthorized" };
  }
  return { ok: true };
}

export { SESSION_COOKIE };
