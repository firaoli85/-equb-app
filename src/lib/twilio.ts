const BASE = "https://verify.twilio.com/v2/Services";

function auth(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

function serviceSid(): string {
  return process.env.TWILIO_VERIFY_SERVICE_SID!.trim();
}

export async function sendVerification(to: string, channel: "sms" | "whatsapp" = "sms"): Promise<void> {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID!.trim();
  const url = `${BASE}/${sid}/Verifications`;
  const body = new URLSearchParams({ To: to, Channel: channel }).toString();

  console.log("[sendVerification] →", { url, to, channel, body });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: auth(),
    },
    body,
  });

  const responseText = await res.text();
  console.log("[sendVerification] ←", { status: res.status, ok: res.ok, body: responseText });

  if (!res.ok) {
    throw new Error(`Twilio Verify send error ${res.status}: ${responseText}`);
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
