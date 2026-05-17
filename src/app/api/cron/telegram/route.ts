import { getCurrentWeekNumber, TOTAL_WEEKS, EQUB_START } from "@/lib/equb";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // Vercel sets CRON_SECRET and passes it as Authorization: Bearer <secret>
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

  // Check if there's a winner this week
  const currentWeek = await db.week.findFirst({
    where: { weekNumber },
    include: {
      payments: false,
    },
  });

  let winnerLine = "";
  if (currentWeek?.winnerWheelNumber) {
    const winner = await db.member.findFirst({
      where: {
        OR: [
          { wheelNumber: currentWeek.winnerWheelNumber },
          { extraWheelNumber: currentWeek.winnerWheelNumber },
        ],
      },
    });
    if (winner) {
      winnerLine = `\n🎉 የዚህ ሳምንት አሸናፊ: ${winner.nameAmharic} (ጎማ #${currentWeek.winnerWheelNumber})`;
    }
  }

  const amharicWeekWord = remaining === 1 ? "ሳምንት" : "ሳምንታት";

  const message =
    `🗓 *ዛሬ የዕቁብ ሳምንት ${weekNumber} ነው።*\n` +
    `${remaining > 0 ? `${remaining} ${amharicWeekWord} ቀርተዋል።` : "ዛሬ የመጨረሻው ሳምንት ነው!"}` +
    winnerLine +
    `\n\n💳 እባክዎ ክፍያዎን ያረጋግጡ።`;

  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(telegramUrl, {
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

  return new Response("OK", { status: 200 });
}
