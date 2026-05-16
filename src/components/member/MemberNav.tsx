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
    <nav
      className="flex items-center gap-2 overflow-x-auto"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
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
            className={`relative flex items-center justify-center px-5 rounded-xl text-[15px] font-bold whitespace-nowrap transition-colors select-none ${
              isActive
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            style={{ minHeight: "48px", touchAction: "manipulation" }}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-1.5 left-4 right-4 h-[2px] bg-white/50 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
