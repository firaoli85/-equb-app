"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memberSignOut } from "@/actions/member-auth";
import { submitReviewRequest } from "@/actions/reviews";

const NAV_TABS = [
  { label: "My Profile",  suffix: "" },
  { label: "Payments",    suffix: "/payments" },
  { label: "Weeks",       suffix: "/weeks" },
  { label: "Collections", suffix: "/collections" },
  { label: "Activity",    suffix: "/activity" },
  { label: "Documents",   suffix: "/documents" },
];

const CLAIMED_OPTIONS = [
  { value: "CASH",   label: "I paid cash" },
  { value: "ZELLE",  label: "I paid via Zelle" },
  { value: "WON",    label: "I won that week (deduct from winnings)" },
  { value: "DOUBLE", label: "I paid two weeks at once" },
  { value: "OTHER",  label: "Other" },
  { value: "SKIP",   label: "I need to skip this week — financial hardship" },
];

export interface EligibleWeek {
  id: string;
  weekNumber: number;
  date: string; // ISO string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  });
}

export function MemberDrawer({
  token,
  eligibleWeeks,
}: {
  token: string;
  eligibleWeeks: EligibleWeek[];
}) {
  const pathname = usePathname();
  const base = `/m/${token}`;

  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [reviewOpen, setReviewOpen]     = useState(false);
  const [reviewKey, setReviewKey]       = useState(0);
  const [reviewResult, setReviewResult] = useState<{ error?: string; success?: boolean }>({});
  const [isSubmitting, startSubmit]     = useTransition();
  const [isSigningOut, startSignOut]    = useTransition();

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = (drawerOpen || reviewOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen, reviewOpen]);

  function isActive(suffix: string) {
    const href = `${base}${suffix}`;
    return suffix === "" ? pathname === base : pathname.startsWith(href);
  }

  function openReview() {
    setDrawerOpen(false);
    setReviewResult({});
    setReviewKey((k) => k + 1);
    setReviewOpen(true);
  }

  function closeReview() {
    setReviewOpen(false);
    setTimeout(() => setReviewResult({}), 300);
  }

  function handleSignOut() {
    startSignOut(async () => { await memberSignOut(); });
  }

  function handleReviewSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSubmit(async () => {
      const result = await submitReviewRequest({}, formData);
      setReviewResult(result);
    });
  }

  return (
    <>
      {/* ── Desktop: horizontal tab row ── */}
      <div className="equb-desktop-nav">
      <nav
        className="flex items-center gap-1 overflow-x-auto"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {NAV_TABS.map((tab) => {
          const active = isActive(tab.suffix);
          return (
            <Link
              key={tab.suffix}
              href={`${base}${tab.suffix}`}
              style={{ minHeight: "40px" }}
              className={`flex items-center justify-center px-4 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors select-none ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={openReview}
          style={{ minHeight: "40px", touchAction: "manipulation" }}
          className="flex items-center justify-center px-4 rounded-xl text-sm font-semibold whitespace-nowrap text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Request Review
        </button>

      </nav>
      </div>

      {/* ── Mobile: hamburger button ── */}
      <div className="equb-mobile-ham">
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
      </div>

      {/* ── Mobile slide-in drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0" style={{ zIndex: 100 }}>
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            style={{ animation: "fadeIn 200ms ease" }}
          />
          <div
            className="absolute top-0 left-0 h-full w-72 max-w-[85vw] bg-white dark:bg-[#141414] shadow-2xl flex flex-col"
            style={{ animation: "slideInLeft 200ms ease" }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800" style={{ minHeight: "56px" }}>
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
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_TABS.map((tab) => {
                const active = isActive(tab.suffix);
                return (
                  <Link
                    key={tab.suffix}
                    href={`${base}${tab.suffix}`}
                    className={`flex items-center gap-3 px-4 rounded-xl font-semibold text-[15px] transition-colors select-none ${
                      active
                        ? "bg-emerald-600 text-white"
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

            {/* Sign Out at the bottom */}
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
        </div>
      )}

      {/* ── Request Payment Review modal ── */}
      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeReview} />
          <div
            className="relative w-full sm:max-w-md bg-white dark:bg-[#141414] rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-10 max-h-[90vh] flex flex-col"
            style={{ animation: "slideInUp 200ms ease" }}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Request Payment Review</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Admin will review and update your record</p>
              </div>
              <button
                onClick={closeReview}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                style={{ touchAction: "manipulation" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
              {reviewResult.success ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-base font-bold text-gray-900 dark:text-white">Request submitted!</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your request has been submitted. Admin will review it shortly.
                  </p>
                  <button
                    type="button"
                    onClick={closeReview}
                    style={{ touchAction: "manipulation" }}
                    className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form key={reviewKey} onSubmit={handleReviewSubmit} className="space-y-4">
                  <input type="hidden" name="token" value={token} />

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Which week?
                    </label>
                    {eligibleWeeks.length === 0 ? (
                      <p className="text-sm text-gray-400 px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                        No weeks are currently eligible for review.
                      </p>
                    ) : (
                      <select
                        name="weekId"
                        required
                        style={{ fontSize: "16px" }}
                        className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Select a week…</option>
                        {eligibleWeeks.map((w) => (
                          <option key={w.id} value={w.id}>
                            Week {w.weekNumber} — {fmtDate(w.date)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      What happened?
                    </label>
                    <select
                      name="claimedStatus"
                      required
                      style={{ fontSize: "16px" }}
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select an option…</option>
                      {CLAIMED_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Date of payment
                    </label>
                    <input
                      name="claimedDate"
                      type="date"
                      required
                      style={{ fontSize: "16px" }}
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Notes <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="Any details for the admin…"
                      style={{ fontSize: "16px" }}
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>

                  {reviewResult.error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">
                      {reviewResult.error}
                    </p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={closeReview}
                      style={{ touchAction: "manipulation" }}
                      className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || eligibleWeeks.length === 0}
                      style={{ touchAction: "manipulation" }}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold transition-colors"
                    >
                      {isSubmitting ? "Submitting…" : "Submit"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn      { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInLeft { from { transform: translateX(-100%) } to { transform: translateX(0) } }
        @keyframes slideInUp   { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .equb-desktop-nav { display: none; }
        @media (min-width: 768px) { .equb-desktop-nav { display: block; } }
        .equb-mobile-ham { display: flex; align-items: center; }
        @media (min-width: 768px) { .equb-mobile-ham { display: none; } }
      `}</style>
    </>
  );
}
