// src/lib/onboarding/steps.ts
// Canonical onboarding step registry.
// Import from '@/lib/onboarding' — do not import this file directly in pages.
//
// ADAPTATION NOTES (deviations from plan):
//   - Profile uses targets: { kcal, protein_g, carbs_g, fat_g } (nested, not flat)
//   - Profile uses allergies: string[] (not allergens)
//   - Goal is 'cut' | 'maintain' | 'bulk' (not 'lose' | 'maintain' | 'gain' | 'performance')
//   - No onboarding_completed_at column in schema
//   - Onboarding completion is tracked by: goal set + body data set + targets.kcal > 0
//   - Steps 4 (allergies) and 5 (pantry seed) are gated the same way — unlocked after
//     step 3 and considered complete once allergies array exists on the profile.
//   - The middleware gate only requires steps 1-3 (goal + body + targets).

import type { Profile } from '@/contracts/zod/profile';

export interface OnboardingStepMeta {
  /** 1-indexed step number, matches [step] URL param */
  step: number;
  /** Route segment: /onboarding/step/[step] */
  segment: string;
  /** Short title shown in the OnboardingStepper progress bar */
  title: string;
  /** Short description shown below the step title */
  description: string;
  /** Returns true when this step's data is present on the (possibly partial) profile row. */
  isComplete: (profile: Partial<Profile> | null) => boolean;
}

export const ONBOARDING_STEPS: readonly OnboardingStepMeta[] = [
  {
    step: 1,
    segment: '1',
    title: 'Your Goal',
    description: 'Tell us what you want to achieve.',
    isComplete: (p) => p != null && !!p.goal,
  },
  {
    step: 2,
    segment: '2',
    title: 'Body Data',
    description: 'We use this to calculate your targets.',
    isComplete: (p) =>
      !!p?.height_cm && !!p?.weight_kg && !!p?.birthdate && !!p?.sex && !!p?.activity_level,
  },
  {
    step: 3,
    segment: '3',
    title: 'Your Targets',
    description: 'Review and adjust your macro targets.',
    // targets.kcal > 0 means targets have been confirmed during onboarding.
    isComplete: (p) => typeof p?.targets?.kcal === 'number' && p.targets.kcal > 0,
  },
  {
    step: 4,
    segment: '4',
    title: 'Dietary Notes',
    description: 'Flag anything we should always avoid.',
    // Step 4 is complete once targets are set (step 3 done).
    // Allergies array is always present on a real profile row (empty array default).
    isComplete: (p) => typeof p?.targets?.kcal === 'number' && p.targets.kcal > 0,
  },
  {
    step: 5,
    segment: '5',
    title: 'Pantry',
    description: 'Seed your pantry (you can skip this).',
    // Step 5 is always skippable; same gate as step 4 — complete once targets confirmed.
    isComplete: (p) => typeof p?.targets?.kcal === 'number' && p.targets.kcal > 0,
  },
] as const;

export const ONBOARDING_TOTAL_STEPS = ONBOARDING_STEPS.length;

/**
 * Returns the first incomplete step for a given profile, or null if all steps are done.
 */
export function firstIncompleteStep(profile: Partial<Profile> | null): OnboardingStepMeta | null {
  return ONBOARDING_STEPS.find((s) => !s.isComplete(profile)) ?? null;
}

/**
 * Returns true when the essential onboarding steps (1-3) are complete.
 * Steps 4-5 (allergies + pantry) are always skippable.
 */
export function isOnboardingComplete(profile: Partial<Profile> | null): boolean {
  if (!profile) return false;
  const step1 = ONBOARDING_STEPS[0]?.isComplete(profile);
  const step2 = ONBOARDING_STEPS[1]?.isComplete(profile);
  const step3 = ONBOARDING_STEPS[2]?.isComplete(profile);
  return step1 && step2 && step3;
}
