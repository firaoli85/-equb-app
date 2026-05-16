export interface DeviceFingerprint {
  [key: string]: string; // index signature — required for Prisma Json compatibility
  browser: string;
  os: string;
  screen: string;
  deviceType: string; // "Mobile" | "Tablet" | "Desktop"
  language: string;
  tokenHint: string; // first 8 chars + "..."
}

export interface ClientFingerprint {
  screen: string;
  language: string;
}

export function buildFingerprint(
  userAgent: string,
  client: ClientFingerprint,
  token: string
): DeviceFingerprint {
  return {
    browser: parseBrowser(userAgent),
    os: parseOs(userAgent),
    screen: sanitizeScreen(client.screen),
    deviceType: parseDeviceType(userAgent),
    language: sanitizeLanguage(client.language),
    tokenHint: token.slice(0, 8) + "...",
  };
}

function parseBrowser(ua: string): string {
  let m: RegExpMatchArray | null;
  if ((m = ua.match(/Edg\/(\d+)/))) return `Edge ${m[1]}`;
  if ((m = ua.match(/OPR\/(\d+)/))) return `Opera ${m[1]}`;
  if (!ua.includes("Chromium") && (m = ua.match(/Chrome\/(\d+)/))) return `Chrome ${m[1]}`;
  if ((m = ua.match(/Firefox\/(\d+)/))) return `Firefox ${m[1]}`;
  if ((m = ua.match(/Version\/(\d+)[^)]*Safari/))) return `Safari ${m[1]}`;
  if (ua.includes("Safari")) return "Safari";
  if ((m = ua.match(/Chromium\/(\d+)/))) return `Chromium ${m[1]}`;
  return "Unknown Browser";
}

function parseOs(ua: string): string {
  let m: RegExpMatchArray | null;
  if ((m = ua.match(/iPhone OS (\d+)/))) return `iOS ${m[1]}`;
  if ((m = ua.match(/iPad.*?OS (\d+)/))) return `iPadOS ${m[1]}`;
  if ((m = ua.match(/Android (\d+)/))) return `Android ${m[1]}`;
  if (ua.includes("Windows NT 10.0")) return "Windows 10/11";
  if (ua.includes("Windows NT 6.3")) return "Windows 8.1";
  if (ua.includes("Windows NT 6.1")) return "Windows 7";
  if ((m = ua.match(/Mac OS X (\d+)[._](\d+)/))) return `macOS ${m[1]}.${m[2]}`;
  if (ua.includes("Linux")) return "Linux";
  return "Unknown OS";
}

function parseDeviceType(ua: string): string {
  if (ua.includes("iPad")) return "Tablet";
  if (ua.includes("Android") && !ua.includes("Mobile")) return "Tablet";
  if (/Mobile|iPhone|iPod|Android/.test(ua)) return "Mobile";
  return "Desktop";
}

function sanitizeScreen(s: string): string {
  return /^\d{1,5}x\d{1,5}$/.test(s) ? s : "unknown";
}

function sanitizeLanguage(l: string): string {
  return /^[a-zA-Z0-9_-]{1,20}$/.test(l) ? l : "unknown";
}
