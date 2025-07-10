// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 1. Specify your protected routes
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/admin'
];
const authRoutes = [
  '/login',
  '/register'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 2. Try to get token safely
  let token;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });
  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Handle auth routes for logged-in users
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 4. Protect private routes
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 5. Admin route protection
  if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
};