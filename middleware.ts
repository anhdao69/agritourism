import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = (req.nextauth?.token as any)?.role;
    const deletedAt = (req.nextauth?.token as any)?.deletedAt;

    // Block deleted users from everything except login/register/reset/verify/home
    if (deletedAt && !pathname.startsWith("/login") && !pathname.startsWith("/register") && !pathname.startsWith("/reset") && !pathname.startsWith("/verify") && pathname !== "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "AccessDenied");
      return NextResponse.redirect(url);
    }

    // Admin-only routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      if (role !== "ADMIN" && role !== "EDITOR") {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("error", "AccessDenied");
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const p = req.nextUrl.pathname;

        // Public paths:
        const publicPaths = [
          "/", "/login", "/register", "/verify", "/reset", "/reset-request",
          "/api/auth/register", "/api/auth/reset", "/api/auth/reset-request", "/api/auth/verify",
          "/api/invite/inspect"
        ];
        if (publicPaths.some((x) => p === x || p.startsWith(x + "/"))) return true;

        // Owner/visitor dashboard etc require login:
        if (p.startsWith("/dashboard") || p.startsWith("/owner") || p.startsWith("/api/listings")) {
          return !!token;
        }

        // Admin requires login (and role checked above)
        if (p.startsWith("/admin") || p.startsWith("/api/admin")) {
          return !!token;
        }

        // default public
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|public/).*)"
  ]
};
