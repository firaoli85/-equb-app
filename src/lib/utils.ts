export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function paymentStatusLabel(
  status: "PENDING" | "PAID" | "LATE"
): string {
  return { PENDING: "Pending", PAID: "Paid", LATE: "Late" }[status];
}

export function paymentMethodLabel(
  method: "CASH" | "ZELLE" | "OTHER" | null | undefined
): string {
  if (!method) return "—";
  return { CASH: "Cash", ZELLE: "Zelle", OTHER: "Other" }[method];
}

export function statusColor(status: "PENDING" | "PAID" | "LATE"): string {
  return {
    PENDING:
      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    PAID: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    LATE: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  }[status];
}

export function statusCellColor(status: "PENDING" | "PAID" | "LATE"): string {
  return {
    PENDING:
      "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600",
    PAID: "bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
    LATE: "bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400",
  }[status];
}
