import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, api routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Always allow /login and /impersonate pages
  if (pathname === "/login" || pathname.startsWith("/impersonate")) {
    return NextResponse.next();
  }

  // Check for branch token or session cookie
  const branchToken = request.cookies.get("rms_branch_token")?.value;
  const branchSession = request.cookies.get("rms_branch_session")?.value;
  const isLocked = request.cookies.get("rms_terminal_locked")?.value === "true";
  const isAuthenticated = !!(branchToken || branchSession);

  // Protect all other routes (/, /kitchen, /orders, /reception)
  if (!isAuthenticated || isLocked) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
