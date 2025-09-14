import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { locales, defaultLocale } from '@/i18n/config';

const intlMiddleware = createIntlMiddleware({
  locales: locales as readonly string[],
  defaultLocale: defaultLocale,
  localePrefix: 'always',
  localeDetection: true,
  alternateLinks: false
});

// Define all valid routes in the application
const validRoutes = [
  '/',
  '/machines',
  '/machine-models', 
  '/maintenance-ranges',
  '/operations',
  '/work-orders',
  '/work-orders/new',
  '/settings',
  '/auth/signin',
  '/auth/signup',
  '/page-wrong'
];

// Check if a path is a valid route
function isValidRoute(pathname: string): boolean {
  // Remove locale prefix for checking
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '') || '/';

  // Check if this is a not-found route - always consider it valid
  if (pathWithoutLocale === '/page-wrong') {
    return true;
  }
  
  return validRoutes.some(route => {
    if (route === '/') {
      return pathWithoutLocale === '/';
    }
    return pathWithoutLocale.startsWith(route);
  });
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if this is an API route or static file
  if (pathname.startsWith('/api/') || 
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/_vercel/') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  // Handle internationalization first
  const intlResponse = intlMiddleware(request);
  
  // Check if this is a valid route
  if (!isValidRoute(pathname)) {
    // This is a 404 route - redirect to our custom not-found
    // Detect locale from pathname or use default
    const detectedLocale = locales.find((locale: string) => pathname.startsWith(`/${locale}/`)) || defaultLocale;
    return NextResponse.redirect(new URL(`/${detectedLocale}/page-wrong`, request.url));
  }

  // Check if this is an auth route
  if (pathname.includes('/auth/')) {
    return intlResponse;
  }

  // Check if this is a not-found route - let it pass through without auth
  if (pathname.includes('/page-wrong')) {
    return intlResponse;
  }

  // Define known protected routes that require authentication
  const protectedRoutes = [
    '/machines',
    '/machine-models', 
    '/maintenance-ranges',
    '/operations',
    '/work-orders',
    '/settings'
  ];

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.includes(route)
  );

  // Only check authentication for known protected routes
  if (isProtectedRoute) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // If no token and trying to access protected routes, redirect to signin
    if (!token) {
      const signInUrl = new URL('/es/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
