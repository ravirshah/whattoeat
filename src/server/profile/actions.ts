'use server';

import { ProfileUpdate } from '@/contracts/zod/profile';
import type { Profile } from '@/contracts/zod/profile';
import { computeTargets } from '@/lib/macros';
import { requireUser } from '@/server/auth';
import { getProfileByUserId, upsertProfile } from '@/server/profile/repo';

const BIOMETRIC_FIELDS = new Set<string>([
  'height_cm',
  'weight_kg',
  'birthdate',
  'sex',
  'activity_level',
  'goal',
]);

/**
 * Returns the current user's profile, or null if they haven't completed
 * onboarding yet. Null return should redirect to /onboarding.
 */
export async function getMyProfile(): Promise<Profile | null> {
  const { userId } = await requireUser();
  return getProfileByUserId(userId);
}

/**
 * Validates and persists a partial profile update.
 * If the patch touches any biometric field and does not explicitly provide
 * `targets`, the action fetches the current profile, merges the patch,
 * and calls computeTargets() — persisting new auto-computed targets.
 * Explicit `targets` in the patch always win (manual override).
 */
export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  const { userId } = await requireUser();

  // Validate via Zod — throws ZodError on invalid input
  const validated = ProfileUpdate.parse(patch);

  const patchKeys = Object.keys(validated);
  const hasBiometric = patchKeys.some((k) => BIOMETRIC_FIELDS.has(k));
  const hasExplicitTargets = 'targets' in validated && validated.targets != null;

  let finalPatch = { ...validated };

  if (hasBiometric && !hasExplicitTargets) {
    // Merge patch onto current profile to get a complete picture for computeTargets
    const current = await getProfileByUserId(userId);
    if (current) {
      const merged: Profile = { ...current, ...validated };
      const computed = computeTargets(merged);
      if (computed) {
        finalPatch = { ...finalPatch, targets: computed };
      }
    }
  }

  return upsertProfile(userId, finalPatch);
}

/**
 * Re-derives macro targets from the current profile's biometrics and
 * persists them, overwriting whatever is currently stored.
 * Useful from the edit page's "Recalculate" button.
 */
export async function recomputeMacros(): Promise<Profile> {
  const { userId } = await requireUser();
  const current = await getProfileByUserId(userId);
  if (!current) {
    throw new Error('No profile found — complete onboarding first.');
  }
  const computed = computeTargets(current);
  if (!computed) {
    throw new Error('Cannot compute targets: profile is missing biometric fields.');
  }
  return upsertProfile(userId, { targets: computed });
}
