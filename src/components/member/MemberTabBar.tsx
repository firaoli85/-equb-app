"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { springs } from "@/lib/motion-tokens";

const TABS = [
  { label: "Home",        suffix: ""               },
  { label: "Payments",    suffix: "/payments"      },
  { label: "Schedule",    suffix: "/weeks"         },
  { label: "Collections", suffix: "/collections"   },
] as const;

function TabIcon({ suffix, active }: { suffix: string; active: boolean }) {
  const cls = `w-5 h-5 ${active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`;
  switch (suffix) {
    case "":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
        </svg>
      );
    case "/payments":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case "/weeks":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
  }
}

export function MemberTabBar({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/m/${token}`;
  const reduce = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  function isActive(suffix: string) {
    const href = `${base}${suffix}`;
    return suffix === "" ? pathname === base : pathname.startsWith(href);
  }

  if (!mounted) return null;

  return createPortal(
    <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0a0a0b]/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary navigation"
      >
        <div className="grid grid-cols-4 h-14">
          {TABS.map((tab) => {
            const active = isActive(tab.suffix);
            return (
              <Link
                key={tab.suffix}
                href={`${base}${tab.suffix}`}
                className="flex flex-col items-center justify-center gap-0.5 select-none active:scale-95"
                style={{ touchAction: "manipulation", minHeight: "44px", transition: "transform 100ms ease-out" }}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative flex items-center justify-center w-10 h-[26px] rounded-full">
                  {active && (
                    <motion.span
                      layoutId="tab-active-bg"
                      className="absolute inset-0 rounded-full bg-indigo-50 dark:bg-indigo-950/60"
                      transition={reduce ? { duration: 0 } : springs.snappy}
                      aria-hidden="true"
                    />
                  )}
                  <TabIcon suffix={tab.suffix} active={active} />
                </span>
                <span
                  className={`text-[10px] font-semibold leading-none transition-colors ${
                    active
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>,
    document.body
  );
}
