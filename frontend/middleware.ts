// frontend/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect portal routes
  if (!pathname.startsWith("/portal")) return NextResponse.next();

  // Allow static files (images, css etc.)
  if (/\.(.*)$/.test(pathname)) return NextResponse.next();

  // Read cookie set on Next origin
  const token = req.cookies.get("access_token_cookie")?.value || null;

  if (token) return NextResponse.next();

  const loginUrl = new URL("/log-in", req.nextUrl.origin);
  loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/portal/:path*"],
};
