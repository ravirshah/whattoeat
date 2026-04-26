// src/lib/onboarding/redirect.ts
// Pure redirect logic — no I/O, no Next.js imports, safe to call from edge middleware.

import type { Profile } from '@/contracts/zod/profile';
import { firstIncompleteStep, isOnboardingComplete } from './steps';

/**
 * Determines whether the current request should be redirected to the onboarding flow.
 *
 * @param profile   The user's current profile row, or null if it does not exist yet.
 * @param pathname  The pathname of the incoming request (e.g. "/home").
 * @returns         A redirect pathname (e.g. "/onboarding/step/1") or null.
 *
 * Rules:
 *  - If already on /onboarding/**, let through (prevents infinite redirect loop).
 *  - If profile is null, redirect to step 1.
 *  - If onboarding is complete, never redirect.
 *  - Otherwise redirect to the first incomplete step.
 */
export function onboardingRedirectPath(
  profile: Partial<Profile> | null,
  pathname: string,
): string | null {
  // Already on the onboarding wizard — never redirect (prevents loops).
  if (pathname.startsWith('/onboarding')) {
    return null;
  }

  // Profile missing entirely — send to step 1.
  if (!profile) {
    return '/onboarding/step/1';
  }

  // Onboarding already done — let through.
  if (isOnboardingComplete(profile)) {
    return null;
  }

  // Onboarding in progress — find the first incomplete step.
  const next = firstIncompleteStep(profile);
  if (!next) return null;

  return `/onboarding/step/${next.segment}`;
}
