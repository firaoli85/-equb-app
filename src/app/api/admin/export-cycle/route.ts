import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import { NEW_SESSION_COOKIE, validateNewAdminSession } from "@/lib/sessions";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function fmt(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function fmtDateTime(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function decimalDollars(val: unknown): string {
  if (val == null) return "";
  return Number(val).toFixed(2);
}

export async function GET() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const sid = cookieStore.get(NEW_SESSION_COOKIE)?.value;
  if (!sid || !(await validateNewAdminSession(sid))) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ── Data queries (parallel) ───────────────────────────────────────────────
  const [members, weeks, payments, payouts] = await Promise.all([
    db.member.findMany({
      where: { isArchived: false },
      orderBy: { wheelNumber: "asc" },
      select: {
        nameAmharic:      true,
        nameEnglishFirst: true,
        nameEnglishLast:  true,
        phone:            true,
        weeklyAmount:     true,
        wheelNumber:      true,
        extraWheelNumber: true,
        confirmedAt:      true,
        token:            true,
      },
    }),

    db.week.findMany({
      orderBy: { weekNumber: "asc" },
      select: {
        weekNumber:    true,
        date:          true,
        isSkipped:     true,
        winnerNumbers: true,
        notes:         true,
      },
    }),

    db.payment.findMany({
      orderBy: [
        { week: { weekNumber: "asc" } },
        { member: { wheelNumber: "asc" } },
      ],
      select: {
        status:  true,
        method:  true,
        paidAt:  true,
        notes:   true,
        paidAmount: true,
        member: { select: { wheelNumber: true, nameAmharic: true } },
        week:   { select: { weekNumber: true, date: true } },
      },
    }),

    db.weekPayout.findMany({
      orderBy: [
        { week: { weekNumber: "asc" } },
        { number: "asc" },
      ],
      select: {
        number:      true,
        wheelType:   true,
        amount:      true,
        status:      true,
        method:      true,
        notes:       true,
        signedAt:    true,
        collectedAt: true,
        week:   { select: { weekNumber: true, date: true } },
        member: { select: { nameAmharic: true } },
      },
    }),
  ]);

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Members ──────────────────────────────────────────────────────
  // This is the primary re-entry sheet. Column order mirrors rebuildNewCycle input.
  const memberRows: (string | number)[][] = [
    [
      "Lucky #",
      "Extra Lucky #",
      "Amharic Name",
      "English First",
      "English Last",
      "Phone",
      "Weekly Amount ($)",
      "Confirmed",
      "Token (member link suffix)",
    ],
    ...members.map((m) => [
      m.wheelNumber,
      m.extraWheelNumber ?? "",
      m.nameAmharic,
      m.nameEnglishFirst,
      m.nameEnglishLast,
      m.phone ?? "",
      dollars(m.weeklyAmount),
      m.confirmedAt ? fmt(m.confirmedAt) : "Not confirmed",
      m.token,
    ]),
    [],
    ["NOTE: PINs are not included in this export. Members will set a new PIN on first login after cycle reset."],
  ];

  const wsMembers = XLSX.utils.aoa_to_sheet(memberRows);
  wsMembers["!cols"] = [
    { wch: 10 }, // Lucky #
    { wch: 13 }, // Extra Lucky #
    { wch: 22 }, // Amharic Name
    { wch: 16 }, // English First
    { wch: 16 }, // English Last
    { wch: 16 }, // Phone
    { wch: 18 }, // Weekly Amount
    { wch: 14 }, // Confirmed
    { wch: 38 }, // Token
  ];
  XLSX.utils.book_append_sheet(wb, wsMembers, "Members");

  // ── Sheet 2: Winners ──────────────────────────────────────────────────────
  // One row per WeekPayout (a number can win once per cycle, MAIN or EXTRA).
  const winnerRows: (string | number)[][] = [
    [
      "Week #",
      "Week Date",
      "Lucky #",
      "Type",
      "Member (Amharic)",
      "Amount ($)",
      "Status",
      "Method",
      "Signed At",
      "Collected At",
      "Notes",
    ],
    ...payouts.map((p) => [
      p.week.weekNumber,
      fmt(p.week.date),
      p.number,
      p.wheelType,
      p.member?.nameAmharic ?? "—",
      decimalDollars(p.amount),
      p.status,
      p.method ?? "",
      fmtDateTime(p.signedAt),
      fmtDateTime(p.collectedAt),
      p.notes ?? "",
    ]),
  ];

  const wsWinners = XLSX.utils.aoa_to_sheet(winnerRows);
  wsWinners["!cols"] = [
    { wch: 8  }, // Week #
    { wch: 12 }, // Week Date
    { wch: 9  }, // Lucky #
    { wch: 8  }, // Type
    { wch: 22 }, // Member
    { wch: 12 }, // Amount
    { wch: 12 }, // Status
    { wch: 10 }, // Method
    { wch: 18 }, // Signed At
    { wch: 18 }, // Collected At
    { wch: 20 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, wsWinners, "Winners");

  // ── Sheet 3: Payments ─────────────────────────────────────────────────────
  // One row per member × week. Full audit trail of who paid what and when.
  const paymentRows: (string | number)[][] = [
    [
      "Lucky #",
      "Member (Amharic)",
      "Week #",
      "Week Date",
      "Status",
      "Method",
      "Paid Amount ($)",
      "Paid At",
      "Notes",
    ],
    ...payments.map((p) => [
      p.member.wheelNumber,
      p.member.nameAmharic,
      p.week.weekNumber,
      fmt(p.week.date),
      p.status,
      p.method ?? "",
      p.paidAmount != null ? dollars(p.paidAmount) : "",
      fmtDateTime(p.paidAt),
      p.notes ?? "",
    ]),
  ];

  const wsPayments = XLSX.utils.aoa_to_sheet(paymentRows);
  wsPayments["!cols"] = [
    { wch: 9  }, // Lucky #
    { wch: 22 }, // Member
    { wch: 8  }, // Week #
    { wch: 12 }, // Week Date
    { wch: 12 }, // Status
    { wch: 10 }, // Method
    { wch: 16 }, // Paid Amount
    { wch: 18 }, // Paid At
    { wch: 24 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, wsPayments, "Payments");

  // ── Sheet 4: Weeks ────────────────────────────────────────────────────────
  // One row per week — dates, skip flags, all drawn numbers.
  const weekRows: (string | number)[][] = [
    ["Week #", "Date", "Skipped", "Winner Numbers", "Notes"],
    ...weeks.map((w) => [
      w.weekNumber,
      fmt(w.date),
      w.isSkipped ? "Yes" : "No",
      w.winnerNumbers.length > 0 ? w.winnerNumbers.join(", ") : "",
      w.notes ?? "",
    ]),
  ];

  const wsWeeks = XLSX.utils.aoa_to_sheet(weekRows);
  wsWeeks["!cols"] = [
    { wch: 8  }, // Week #
    { wch: 12 }, // Date
    { wch: 9  }, // Skipped
    { wch: 22 }, // Winner Numbers
    { wch: 30 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, wsWeeks, "Weeks");

  // ── Emit ──────────────────────────────────────────────────────────────────
  const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const today = new Date().toISOString().slice(0, 10);
  const filename = `equb-cycle-backup-${today}.xlsx`;

  return new Response(new Uint8Array(xlsxBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
