const BASE = "https://verify.twilio.com/v2/Services";

function auth(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

function serviceSid(): string {
  return process.env.TWILIO_VERIFY_SERVICE_SID!.trim();
}

export async function sendVerification(to: string): Promise<void> {
  const res = await fetch(`${BASE}/${serviceSid()}/Verifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: auth(),
    },
    body: new URLSearchParams({ To: to, Channel: "sms" }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio Verify send error ${res.status}: ${text}`);
  }
}

// "approved"  — code is correct
// "expired"   — 404: verification not found, already used, or timed out
// "invalid"   — wrong code, still pending
export type VerifyCheckResult = "approved" | "expired" | "invalid";

export async function checkVerification(to: string, code: string): Promise<VerifyCheckResult> {
  const res = await fetch(`${BASE}/${serviceSid()}/VerificationChecks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: auth(),
    },
    body: new URLSearchParams({ To: to, Code: code }).toString(),
  });

  const bodyText = await res.text();
  console.log(`[checkVerification] HTTP ${res.status} | body: ${bodyText}`);

  if (res.status === 404) return "expired";
  if (!res.ok) return "invalid";

  let parsed: { status?: string };
  try { parsed = JSON.parse(bodyText); } catch { return "invalid"; }

  console.log("[checkVerification] Twilio status:", parsed.status);
  return parsed.status === "approved" ? "approved" : "invalid";
}
