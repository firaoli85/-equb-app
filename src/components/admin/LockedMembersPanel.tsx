"use client";

import { useState, useEffect } from "react";

interface LockedMember {
  id: string;
  nameAmharic: string;
  nameEnglishFirst: string;
  phone: string | null;
  pinLockedUntil: string; // ISO string
}

function minutesRemaining(isoString: string): number {
  return Math.max(0, Math.ceil((new Date(isoString).getTime() - Date.now()) / 60_000));
}

export function LockedMembersPanel({ initialLocked }: { initialLocked: LockedMember[] }) {
  const [locked, setLocked] = useState(initialLocked);
  const [unlocking, setUnlocking] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  // Re-filter expired lockouts every minute
  useEffect(() => {
    const id = setInterval(() => {
      setLocked((prev) => prev.filter((m) => minutesRemaining(m.pinLockedUntil) > 0));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  if (locked.length === 0) return null;

  async function handleUnlock(member: LockedMember) {
    setUnlocking((prev) => new Set(prev).add(member.id));
    try {
      const res = await fetch("/api/admin/unlock-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });
      if (res.ok) {
        setLocked((prev) => prev.filter((m) => m.id !== member.id));
        setToast(`${member.nameEnglishFirst || member.nameAmharic} unlocked`);
      } else {
        setToast("Unlock failed — try again");
      }
    } catch {
      setToast("Network error — try again");
    } finally {
      setUnlocking((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    }
  }

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg animate-fade-in-up">
          ✓ {toast}
        </div>
      )}

      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/60 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
              PIN Locked — {locked.length} member{locked.length !== 1 ? "s" : ""}
            </h2>
            <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">
              Too many failed login attempts
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {locked.map((m) => {
            const mins = minutesRemaining(m.pinLockedUntil);
            const isUnlocking = unlocking.has(m.id);
            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 bg-white dark:bg-[#1a0a0a] border border-red-100 dark:border-red-900/60 rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {m.nameEnglishFirst || m.nameAmharic}
                    {m.nameAmharic !== m.nameEnglishFirst && m.nameEnglishFirst && (
                      <span className="text-gray-400 dark:text-gray-500 font-normal ml-1.5">
                        ({m.nameAmharic})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                    {m.phone && <span>{m.phone}</span>}
                    <span className="text-red-500 dark:text-red-400 font-medium">
                      {mins > 0 ? `${mins} min remaining` : "Expired"}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => handleUnlock(m)}
                  disabled={isUnlocking}
                  className="shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {isUnlocking ? "Unlocking…" : "Unlock"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
