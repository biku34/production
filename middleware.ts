import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { canAccessPath, homeFor } from "@/lib/access";

/**
 * Route protection + per-role module access. Unauthenticated users are bounced
 * to /login; an authed user visiting /login (or a module their role can't open)
 * is sent to their home. API routes are excluded here (the ones that mutate
 * enforce their own session + scope check) so /api/auth/login stays reachable.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL(homeFor(session.role), req.url));
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Role can't open this module → send to their own home.
  if (!canAccessPath(session.role, pathname)) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals and static/PWA assets.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|robots.txt).*)",
  ],
};
