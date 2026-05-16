"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "My Profile", suffix: "" },
  { label: "Payments", suffix: "/payments" },
  { label: "Weeks", suffix: "/weeks" },
  { label: "Collections", suffix: "/collections" },
  { label: "Activity", suffix: "/activity" },
];

export function MemberNav({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/m/${token}`;

  return (
    <nav className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {TABS.map((tab) => {
        const href = `${base}${tab.suffix}`;
        const isActive =
          tab.suffix === ""
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.suffix}
            href={href}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              isActive
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
