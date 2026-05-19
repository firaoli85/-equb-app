export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export type PaymentStatus = "PENDING" | "PAID" | "LATE" | "DEFERRED" | "PARTIAL";

export function paymentStatusLabel(status: PaymentStatus): string {
  return {
    PENDING:  "Pending",
    PAID:     "Paid",
    LATE:     "Late",
    DEFERRED: "Deferred — agreed skip",
    PARTIAL:  "Partial Payment",
  }[status];
}

export function paymentMethodLabel(
  method: "CASH" | "ZELLE" | "OTHER" | null | undefined
): string {
  if (!method) return "—";
  return { CASH: "Cash", ZELLE: "Zelle", OTHER: "Other" }[method];
}

export function statusColor(status: PaymentStatus): string {
  return {
    PENDING:  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    PAID:     "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    LATE:     "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    DEFERRED: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    PARTIAL:  "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  }[status];
}

export function statusCellColor(status: PaymentStatus): string {
  return {
    PENDING:  "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600",
    PAID:     "bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
    LATE:     "bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400",
    DEFERRED: "bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400",
    PARTIAL:  "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",
  }[status];
}
