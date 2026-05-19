import { getCurrentWeekNumber, TOTAL_WEEKS, EQUB_START } from "@/lib/equb";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return new Response("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured", { status: 500 });
  }

  const week1 = await db.week.findFirst({ where: { weekNumber: 1 }, select: { date: true } });
  const weekNumber = getCurrentWeekNumber(week1?.date ?? EQUB_START);

  if (weekNumber < 1 || weekNumber > TOTAL_WEEKS) {
    return new Response("Equb not active", { status: 200 });
  }

  const remaining = TOTAL_WEEKS - weekNumber;
  const remainingWord = remaining === 1 ? "ሳምንት" : "ሳምንታት";
  const remainingEn = remaining === 1 ? "week" : "weeks";

  // Previous message (single bilingual line-by-line):
  // 🗓 ዛሬ የዕቁብ ሳምንት *N* ነው። | Week *N* of your Equb is today.
  // ⏳ N ሳምንታት ቀርተዋል። | N weeks remaining.
  // 💳 እባክዎ ክፍያዎን ያረጋግጡ። | Please make your weekly payment.
  // 🔗 Login: https://equb-app-hazel.vercel.app/login

  const message =
    `🗓 ዛሬ የዕቁብ ሳምንት *${weekNumber}* ነው።\n` +
    `⏳ ${remaining} ${remainingWord} ቀርተዋል።\n` +
    `💰 እባክዎ የዚህን ሳምንት ክፍያ ያረጋግጡ።\n` +
    `💳 ዘሌ: 301-541-6005 (Firaoli Seboka)\n` +
    `🔗 ሎጊን: https://equb-app-hazel.vercel.app/login\n` +
    `\n` +
    `―――――――――――――――――\n` +
    `\n` +
    `🗓 Week *${weekNumber}* of your Equb is today.\n` +
    `⏳ ${remaining} ${remainingEn} remaining.\n` +
    `💰 Please make your weekly payment.\n` +
    `💳 Zelle: 301-541-6005 (Firaoli Seboka)\n` +
    `🔗 Login: https://equb-app-hazel.vercel.app/login`;

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return new Response(`Telegram error: ${body}`, { status: 500 });
  }

  return new Response(`OK — sent Week ${weekNumber} reminder`, { status: 200 });
}
