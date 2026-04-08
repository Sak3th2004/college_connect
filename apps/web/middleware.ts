import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define protected routes with role-based access
const protectedRoutes = {
  '/dashboard': ['STUDENT', 'FACULTY', 'DEPARTMENT_ADMIN', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
  '/dashboard/student': ['STUDENT'],
  '/dashboard/faculty': ['FACULTY'],
  '/dashboard/dept-admin': ['DEPARTMENT_ADMIN'],
  '/dashboard/college-admin': ['INSTITUTION_ADMIN'],
  '/dashboard/super-admin': ['SUPER_ADMIN'],
  '/admin': ['DEPARTMENT_ADMIN', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
  '/profile': ['STUDENT', 'FACULTY', 'DEPARTMENT_ADMIN', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
  '/appointments': ['STUDENT', 'FACULTY'],
  '/queue': ['STUDENT', 'FACULTY'],
  '/support': ['STUDENT', 'FACULTY', 'DEPARTMENT_ADMIN', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
  '/notifications': ['STUDENT', 'FACULTY', 'DEPARTMENT_ADMIN', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
};

// Public routes that don't require auth but still have layout
const publicRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/pricing',
  '/about',
  '/contact',
  '/demo',
];

// Auth routes (redirect to dashboard if already logged in)
const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's an API route - let it pass (handled by backend)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check for authentication cookie (JWT in cookies)
  const token = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // If no tokens, check localStorage via request headers (set by client)
  // For SSR protection, we'll rely on cookies only

  // Check if route is protected
  let isProtected = false;
  let allowedRoles: string[] = [];

  for (const [route, roles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      isProtected = true;
      allowedRoles = roles;
      break;
    }
  }

  // If not protected, allow
  if (!isProtected) {
    return NextResponse.next();
  }

  // If protected and no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token (basic validation - should match backend verification)
  try {
    // For middleware, we'll just check if token exists
    // Full validation happens on API calls
    // You could decode and verify JWT here if needed

    // Check user role from token payload if available (in cookie)
    // For now, just allow if token exists; role-based checks happen in pages
    return NextResponse.next();
  } catch (error) {
    // Invalid token, clear cookies and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }
}

export const config = {
  matcher: [
    // Protect all dashboard routes
    '/dashboard/:path*',
    '/admin/:path*',
    // Protect role-based routes
    '/profile/:path*',
    '/appointments/:path*',
    '/queue/:path*',
    '/support/:path*',
    '/notifications/:path*',
    // Exclude public routes
    '/((?!login|signup|forgot-password|reset-password|pricing|about|contact|demo|_next|api).*)',
  ],
};
