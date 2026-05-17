"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "My Profile",   suffix: "" },
  { label: "Payments",     suffix: "/payments" },
  { label: "Weeks",        suffix: "/weeks" },
  { label: "Collections",  suffix: "/collections" },
  { label: "Activity",     suffix: "/activity" },
];

export function MemberDrawer({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/m/${token}`;
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function isActive(suffix: string) {
    const href = `${base}${suffix}`;
    return suffix === "" ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* ── Desktop: inline tabs ── */}
      <nav className="hidden md:flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
        {TABS.map((tab) => {
          const href = `${base}${tab.suffix}`;
          const active = isActive(tab.suffix);
          return (
            <Link
              key={tab.suffix}
              href={href}
              className={`relative flex items-center justify-center px-5 rounded-xl text-[15px] font-bold whitespace-nowrap transition-colors select-none ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              style={{ minHeight: "48px" }}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-1.5 left-4 right-4 h-[2px] bg-white/50 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Mobile: hamburger button ── */}
      <button
        className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setOpen(true)}
        style={{ touchAction: "manipulation" }}
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ── Drawer overlay ── */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Dark backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            style={{ animation: "fadeIn 200ms ease" }}
          />

          {/* Slide-in panel */}
          <div
            className="absolute top-0 left-0 h-full w-72 max-w-[85vw] bg-white dark:bg-[#141414] shadow-2xl flex flex-col"
            style={{ animation: "slideInLeft 200ms ease" }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-950 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Equb</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                style={{ touchAction: "manipulation" }}
                aria-label="Close menu"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {TABS.map((tab) => {
                const href = `${base}${tab.suffix}`;
                const active = isActive(tab.suffix);
                return (
                  <Link
                    key={tab.suffix}
                    href={href}
                    className={`flex items-center gap-3 px-4 rounded-xl font-semibold text-[15px] transition-colors select-none ${
                      active
                        ? "bg-emerald-600 text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    style={{ minHeight: "56px", touchAction: "manipulation" }}
                  >
                    {tab.label}
                    {active && (
                      <svg className="ml-auto w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}
