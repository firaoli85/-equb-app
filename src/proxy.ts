import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, validateSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip the login page to avoid redirect loops
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token || !(await validateSessionToken(token))) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Valid — reissue with a fresh issuedAt to roll the idle window.
  const freshToken = await createSessionToken();
  const response = NextResponse.next();
  response.cookies.set(SESSION_COOKIE, freshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 60,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
