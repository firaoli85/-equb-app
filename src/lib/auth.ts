const SESSION_COOKIE = "equb_session";
const SESSION_DATA = "equb-admin-v1";

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

export async function createSessionToken(): Promise<string> {
  const key = await getKey();
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(SESSION_DATA));
  return Buffer.from(sig).toString("hex");
}

export async function validateSessionToken(token: string): Promise<boolean> {
  try {
    const key = await getKey();
    const enc = new TextEncoder();
    const sigBytes = Buffer.from(token, "hex");
    return await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      enc.encode(SESSION_DATA)
    );
  } catch {
    return false;
  }
}

export { SESSION_COOKIE };
