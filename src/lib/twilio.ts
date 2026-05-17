const BASE = "https://verify.twilio.com/v2/Services";

function auth(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

function serviceSid(): string {
  return process.env.TWILIO_VERIFY_SERVICE_SID!;
}

// Trigger a Verify SMS to `to` (E.164 format, e.g. "+12125551234")
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
    throw new Error(`Twilio Verify error ${res.status}: ${text}`);
  }
}

// Returns true if the code is correct and the verification is approved
export async function checkVerification(to: string, code: string): Promise<boolean> {
  const res = await fetch(`${BASE}/${serviceSid()}/VerificationChecks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: auth(),
    },
    body: new URLSearchParams({ To: to, Code: code }).toString(),
  });

  if (!res.ok) return false;
  const json = (await res.json()) as { status: string };
  return json.status === "approved";
}
