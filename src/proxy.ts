import { NextRequest, NextResponse } from "next/server";

// Inlined — avoids any module-resolution issue in the proxy bundle.
// Full HMAC validation is done in src/app/admin/(protected)/layout.tsx.
const SESSION_COOKIE = "equb_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  // Fast path: if no session cookie exists at all, skip rendering entirely.
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
