import { NextRequest, NextResponse } from "next/server";

// Middleware always runs on Edge by default — no runtime declaration needed.
// Cookie presence only — full DB validation happens in the member layout.
export function middleware(req: NextRequest) {
  const session = req.cookies.get("equb_member_session");
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/m/:path*"],
};
