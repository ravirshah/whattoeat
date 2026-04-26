import { onboardingRedirectPath } from '@/lib/onboarding';
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
    isOnSegment('/home') ||
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

  // ── Onboarding gate ──────────────────────────────────────────────────────
  // For authenticated users on protected routes, check whether onboarding is
  // complete. Fetch only the minimal profile fields needed for the gate.
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('goal, height_cm, weight_kg, birthdate, sex, activity_level, target_kcal, allergies')
      .eq('user_id', user.id)
      .maybeSingle();

    // Normalise to the shape expected by onboardingRedirectPath:
    // The DB returns flat target_kcal; we map it to targets.kcal for the profile contract.
    const profileForGate = profile
      ? {
          goal: profile.goal as string | undefined,
          height_cm: profile.height_cm ? Number(profile.height_cm) : null,
          weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
          birthdate: profile.birthdate as string | null,
          sex: profile.sex as string | null,
          activity_level: profile.activity_level as string | null,
          targets: { kcal: profile.target_kcal ?? 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
          allergies: profile.allergies ?? [],
        }
      : null;

    const redirectPath = onboardingRedirectPath(
      profileForGate as Parameters<typeof onboardingRedirectPath>[0],
      pathname,
    );

    if (redirectPath) {
      const url = request.nextUrl.clone();
      url.pathname = redirectPath;
      return NextResponse.redirect(url);
    }
  }
  // ── End onboarding gate ──────────────────────────────────────────────────

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
