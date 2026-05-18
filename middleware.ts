import { NextRequest, NextResponse } from "next/server";

// Edge-compatible: cookie presence only — full DB validation happens in layout
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
