import { createMiddlewareClient } from '@/lib/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Start with a plain pass-through response; the middleware client
  // may mutate its cookies to deliver the refreshed session token.
  const response = NextResponse.next({ request });

  const supabase = createMiddlewareClient(request, response);

  // IMPORTANT: always use getUser(), not getSession(), in middleware.
  // getUser() validates the JWT against Supabase on every call and is
  // the only call that can reliably refresh the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect the authenticated route group.
  // Public routes: /auth/*, /onboarding/*, /, /api/auth/* and static files.
  // Match exact segments so e.g. /profiles or /savedlist do not accidentally
  // gate routes that may exist later under different prefixes.
  const isOnSegment = (segment: string) =>
    pathname === segment || pathname.startsWith(`${segment}/`);
  const isProtected =
    pathname.startsWith('/(authenticated)') ||
    isOnSegment('/pantry') ||
    isOnSegment('/profile') ||
    isOnSegment('/feed-me') ||
    isOnSegment('/saved') ||
    isOnSegment('/checkin');

  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth entry pages.
  if (user && (isOnSegment('/auth/login') || isOnSegment('/auth/signup'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - api/auth/*    (Supabase redirect callbacks must not be intercepted)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/auth).*)',
  ],
};
