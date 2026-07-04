import { NextRequest, NextResponse } from "next/server";

// This file is not wired up as Next.js middleware (no middleware.ts imports it).
// Kept as a stub so it compiles cleanly.
export async function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
