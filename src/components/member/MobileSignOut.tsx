"use client";

import { useTransition } from "react";
import { memberSignOut } from "@/actions/member-auth";

export function MobileSignOut() {
  const [isPending, start] = useTransition();

  return (
    <button
      onClick={() => start(async () => { await memberSignOut(); })}
      disabled={isPending}
      className="md:hidden flex items-center justify-center h-10 px-3 rounded-xl text-sm font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
      style={{ touchAction: "manipulation" }}
      aria-label="Sign out"
    >
      {isPending ? "…" : "Sign Out"}
    </button>
  );
}
