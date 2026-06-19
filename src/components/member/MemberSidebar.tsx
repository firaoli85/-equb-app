"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memberSignOut } from "@/actions/member-auth";
import { ReviewModal, type EligibleWeek, type ReviewModalHandle } from "@/components/member/ReviewModal";

// ── Nav data ────────────────────────────────────────────────────────────────
// Inline SVG paths keyed by suffix. Two-element arrays have two <path>s.
const PRIMARY_NAV = [
  {
    label: "Home",
    suffix: "",
    paths: [
      "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
      "M9 22V12h6v10",
    ],
  },
  {
    label: "Payments",
    suffix: "/payments",
    paths: [
      "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    ],
  },
  {
    label: "Schedule",
    suffix: "/weeks",
    paths: [
      "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    ],
  },
  {
    label: "Collections",
    suffix: "/collections",
    paths: [
      "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    ],
  },
] as const;

const SECONDARY_NAV = [
  {
    label: "Activity",
    suffix: "/activity",
    paths: ["M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"],
  },
  {
    label: "Documents",
    suffix: "/documents",
    paths: [
      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    ],
  },
] as const;

// ── Component ────────────────────────────────────────────────────────────────
export function MemberSidebar({
  token,
  eligibleWeeks,
}: {
  token: string;
  eligibleWeeks: EligibleWeek[];
}) {
  const pathname = usePathname();
  const base = `/m/${token}`;

  const [isSigningOut, startSignOut] = useTransition();
  const reviewRef = useRef<ReviewModalHandle>(null);

  function isActive(suffix: string) {
    const href = `${base}${suffix}`;
    return suffix === "" ? pathname === base : pathname.startsWith(href);
  }

  function handleSignOut() {
    // Clear the tally animation flag so the next login animates fresh
    try { sessionStorage.removeItem(`equb_tally_animated_${token}`); } catch {}
    startSignOut(async () => { await memberSignOut(); });
  }

  // Shared class builders
  function linkCls(suffix: string) {
    return [
      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors select-none",
      isActive(suffix)
        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200",
    ].join(" ");
  }

  function iconCls(suffix: string) {
    return [
      "w-4 h-4 shrink-0",
      isActive(suffix)
        ? "text-indigo-600 dark:text-indigo-400"
        : "text-gray-400 dark:text-gray-500",
    ].join(" ");
  }

  function NavIcon({ paths, suffix }: { paths: readonly string[]; suffix: string }) {
    return (
      <svg className={iconCls(suffix)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {paths.map((d, i) => (
          <path key={i} strokeLinecap="round" strokeLinejoin="round" d={d} />
        ))}
      </svg>
    );
  }

  return (
    // hidden on mobile, flex column on md+
    <aside
      className="hidden md:flex flex-col fixed top-16 left-0 bottom-0 w-60 bg-white dark:bg-[#0a0a0b] border-r border-gray-100 dark:border-gray-800/60 z-30"
      aria-label="Sidebar navigation"
    >
      {/* Brand header */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100 dark:border-gray-800/60 shrink-0">
        <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-950 rounded-lg flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="font-bold text-gray-900 dark:text-white text-sm">Equb</span>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {/* Primary */}
        {PRIMARY_NAV.map((item) => (
          <Link key={item.suffix} href={`${base}${item.suffix}`} className={linkCls(item.suffix)}>
            <NavIcon paths={item.paths} suffix={item.suffix} />
            {item.label}
          </Link>
        ))}

        <div className="border-t border-gray-100 dark:border-gray-800 my-2" />

        {/* Secondary */}
        {SECONDARY_NAV.map((item) => (
          <Link key={item.suffix} href={`${base}${item.suffix}`} className={linkCls(item.suffix)}>
            <NavIcon paths={item.paths} suffix={item.suffix} />
            {item.label}
          </Link>
        ))}

        <div className="border-t border-gray-100 dark:border-gray-800 my-2" />

        {/* Request Payment Review */}
        <button
          type="button"
          onClick={() => reviewRef.current?.open()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Request Payment Review
        </button>
      </nav>

      {/* Sign Out — always at the bottom */}
      <div className="px-2 pb-6 pt-2 border-t border-gray-100 dark:border-gray-800 shrink-0">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {isSigningOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>

      <ReviewModal ref={reviewRef} token={token} eligibleWeeks={eligibleWeeks} />
    </aside>
  );
}
