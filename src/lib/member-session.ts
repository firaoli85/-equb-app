import { cookies } from "next/headers";

export const MEMBER_COOKIE = "equb_member_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.MEMBER_SESSION_SECRET!;
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// Returns signed cookie value: "<token>.<hex-sig>"
export async function signMemberToken(token: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token));
  return `${token}.${Buffer.from(sig).toString("hex")}`;
}

// Validates cookie value and returns the token, or null if invalid
export async function verifyMemberCookie(value: string): Promise<string | null> {
  try {
    const dot = value.lastIndexOf(".");
    if (dot === -1) return null;
    const token = value.slice(0, dot);
    const sig = Buffer.from(value.slice(dot + 1), "hex");
    const key = await getKey();
    const valid = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(token));
    return valid ? token : null;
  } catch {
    return null;
  }
}

export async function setMemberSessionCookie(token: string): Promise<void> {
  const signed = await signMemberToken(token);
  const jar = await cookies();
  jar.set(MEMBER_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

// Returns the member token from cookie, or null
export async function getMemberTokenFromCookie(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(MEMBER_COOKIE)?.value;
  if (!raw) return null;
  return verifyMemberCookie(raw);
}
