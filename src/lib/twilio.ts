function auth(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

export async function sendSms(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const from = process.env.TWILIO_PHONE_NUMBER!.trim();

  console.log(`[sendSms] POST Messages.json — from: ${from} to: ${to}`);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: auth(),
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    }
  );

  const bodyText = await res.text();
  console.log(`[sendSms] HTTP ${res.status} | body: ${bodyText}`);

  if (!res.ok) {
    throw new Error(`Twilio SMS error ${res.status}: ${bodyText}`);
  }

  try {
    const parsed = JSON.parse(bodyText) as { sid?: string; status?: string };
    console.log(`[sendSms] message SID: ${parsed.sid} status: ${parsed.status}`);
  } catch {
    // non-JSON success body — already logged above
  }
}
