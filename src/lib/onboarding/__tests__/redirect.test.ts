// src/lib/onboarding/__tests__/redirect.test.ts
import { describe, expect, it } from 'vitest';
import { onboardingRedirectPath } from '../redirect';

describe('onboardingRedirectPath', () => {
  it('redirects to step 1 when profile is null', () => {
    expect(onboardingRedirectPath(null, '/home')).toBe('/onboarding/step/1');
  });

  it('redirects to step 1 when profile has no goal', () => {
    expect(onboardingRedirectPath({}, '/home')).toBe('/onboarding/step/1');
  });

  it('redirects to step 2 when goal is set but body data is missing', () => {
    expect(
      onboardingRedirectPath(
        { goal: 'maintain', targets: { kcal: 2000, protein_g: 150, carbs_g: 220, fat_g: 55 } },
        '/home',
      ),
    ).toBe('/onboarding/step/2');
  });

  it('redirects to step 3 when body data is complete but targets.kcal is 0', () => {
    const partialProfile = {
      goal: 'cut' as const,
      height_cm: 175,
      weight_kg: 80,
      birthdate: '1990-01-01',
      sex: 'male' as const,
      activity_level: 'moderate' as const,
      targets: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    };
    expect(onboardingRedirectPath(partialProfile, '/home')).toBe('/onboarding/step/3');
  });

  it('returns null when onboarding is complete (goal + body + targets)', () => {
    const completeProfile = {
      goal: 'maintain' as const,
      height_cm: 165,
      weight_kg: 65,
      birthdate: '1992-06-15',
      sex: 'female' as const,
      activity_level: 'active' as const,
      targets: { kcal: 1900, protein_g: 143, carbs_g: 213, fat_g: 53 },
    };
    expect(onboardingRedirectPath(completeProfile, '/home')).toBeNull();
  });

  it('returns null when already on /onboarding/** route (prevents redirect loop)', () => {
    expect(onboardingRedirectPath(null, '/onboarding/step/1')).toBeNull();
    expect(onboardingRedirectPath(null, '/onboarding')).toBeNull();
    expect(onboardingRedirectPath({}, '/onboarding/step/3')).toBeNull();
  });

  it('returns null when onboarding is complete regardless of target route', () => {
    const completeProfile = {
      goal: 'bulk' as const,
      height_cm: 180,
      weight_kg: 90,
      birthdate: '1995-03-20',
      sex: 'male' as const,
      activity_level: 'very_active' as const,
      targets: { kcal: 3000, protein_g: 198, carbs_g: 338, fat_g: 83 },
    };
    expect(onboardingRedirectPath(completeProfile, '/feed-me')).toBeNull();
    expect(onboardingRedirectPath(completeProfile, '/pantry')).toBeNull();
    expect(onboardingRedirectPath(completeProfile, '/profile')).toBeNull();
  });
});
