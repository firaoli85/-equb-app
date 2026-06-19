"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memberSignOut } from "@/actions/member-auth";
import { ReviewModal, type EligibleWeek, type ReviewModalHandle } from "@/components/member/ReviewModal";

// Re-export so any existing imports of EligibleWeek from this file keep working.
export type { EligibleWeek };

// Secondary nav: Activity + Documents.
// Primary tabs (Home, Payments, Schedule, Collections) live in MemberTabBar.
const DRAWER_TABS = [
  { label: "Activity",  suffix: "/activity"  },
  { label: "Documents", suffix: "/documents" },
];

export function MemberDrawer({
  token,
  eligibleWeeks,
}: {
  token: string;
  eligibleWeeks: EligibleWeek[];
}) {
  const pathname = usePathname();
  const base = `/m/${token}`;

  const [mounted,     setMounted]     = useState(false);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [isSigningOut, startSignOut]  = useTransition();

  const reviewRef = useRef<ReviewModalHandle>(null);

  useEffect(() => { setMounted(true); }, []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  function isActive(suffix: string) {
    const href = `${base}${suffix}`;
    return suffix === "" ? pathname === base : pathname.startsWith(href);
  }

  function openReview() {
    setDrawerOpen(false);
    reviewRef.current?.open();
  }

  function handleSignOut() {
    // Clear the tally animation flag so the next login animates fresh
    try { sessionStorage.removeItem(`equb_tally_animated_${token}`); } catch {}
    startSignOut(async () => { await memberSignOut(); });
  }

  const drawerPortal = mounted && drawerOpen
    ? createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          {/* Backdrop */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              animation: "equb-fadeIn 200ms ease",
            }}
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel */}
          <div
            className="bg-white dark:bg-[#141414]"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: "288px",
              maxWidth: "85vw",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              animation: "equb-slideInLeft 200ms ease",
            }}
          >
            {/* Drawer header */}
            <div
              className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800"
              style={{ minHeight: "56px", padding: "12px 16px" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-950 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Equb</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                style={{ minWidth: "44px", minHeight: "44px", touchAction: "manipulation" }}
                aria-label="Close menu"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <nav
              className="flex-1 overflow-y-auto"
              style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}
            >
              {DRAWER_TABS.map((tab) => {
                const active = isActive(tab.suffix);
                return (
                  <Link
                    key={tab.suffix}
                    href={`${base}${tab.suffix}`}
                    className={`flex items-center gap-3 px-4 rounded-xl font-semibold text-[15px] transition-colors select-none ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    style={{ minHeight: "56px", touchAction: "manipulation" }}
                  >
                    {tab.label}
                    {active && (
                      <svg className="ml-auto w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={openReview}
                className="w-full flex items-center gap-3 px-4 rounded-xl font-semibold text-[15px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                style={{ minHeight: "56px", touchAction: "manipulation" }}
              >
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Request Payment Review
              </button>
            </nav>

            {/* Sign Out */}
            <div className="px-3 pb-8 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-bold text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
                style={{ touchAction: "manipulation" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {isSigningOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {/* Hamburger button */}
      <button
        className="flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setDrawerOpen(true)}
        style={{ minWidth: "44px", minHeight: "44px", touchAction: "manipulation" }}
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {drawerPortal}

      <ReviewModal ref={reviewRef} token={token} eligibleWeeks={eligibleWeeks} />

      <style>{`
        @keyframes equb-fadeIn      { from { opacity: 0 }               to { opacity: 1 } }
        @keyframes equb-slideInLeft { from { transform: translateX(-100%) } to { transform: translateX(0) } }
      `}</style>
    </>
  );
}
