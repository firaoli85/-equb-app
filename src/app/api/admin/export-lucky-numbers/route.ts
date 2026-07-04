import { cookies } from "next/headers";
import { NEW_SESSION_COOKIE, validateNewAdminSession } from "@/lib/sessions";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function csvCell(value: string | number): string {
  const s = String(value);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function GET() {
  const cookieStore = await cookies();
  const sid = cookieStore.get(NEW_SESSION_COOKIE)?.value;
  if (!sid || !(await validateNewAdminSession(sid))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const members = await db.member.findMany({
    where: { isArchived: false },
    orderBy: { wheelNumber: "asc" },
    select: {
      nameEnglishFirst: true,
      nameEnglishLast: true,
      nameAmharic: true,
      weeklyAmount: true,
      wheelNumber: true,
    },
  });

  const header = ["Lucky Number", "Member Number", "Member Name (English)", "Weekly Contribution"].join(",");

  const rows = members.map((m, i) => {
    const name =
      [m.nameEnglishFirst, m.nameEnglishLast].filter(Boolean).join(" ").trim() ||
      m.nameAmharic;
    const weekly = (m.weeklyAmount / 100).toFixed(2);
    return [
      csvCell(m.wheelNumber),
      csvCell(i + 1),
      csvCell(name),
      csvCell(`$${weekly}`),
    ].join(",");
  });

  const csv = [header, ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="equb-lucky-numbers.csv"',
    },
  });
}
