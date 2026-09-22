import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/register/");

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/admin");

  if (!isAuthRoute && !isProtectedRoute) {
    return NextResponse.next();
  }

  let token;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch (error) {
    console.error("Token verification failed:", error);
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/admin/:path*", "/login", "/register"],
};
