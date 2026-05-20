// middleware.ts

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;

  const pathname = req.nextUrl.pathname;

  const isAuthPage = pathname.startsWith("/login");

  // Public routes
  const publicRoutes = ["/"];

  const isPublicRoute = publicRoutes.includes(pathname);

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Prevent logged user opening login page
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(
      new URL("/dashboard", req.nextUrl),
    );
  }

  // Allow login page
  if (isAuthPage) {
    return NextResponse.next();
  }

  // Protect private pages
  if (!isLoggedIn) {
    return NextResponse.redirect(
      new URL("/login", req.nextUrl),
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vendors/:path*",
    "/approvals/:path*",
    "/tracking/:path*",
    "/inventory",
    "/inventory/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/users/:path*",
    "/flights/:path*",
  ],
};