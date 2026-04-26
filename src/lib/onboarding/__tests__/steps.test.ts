// src/lib/onboarding/__tests__/steps.test.ts
import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS,
  firstIncompleteStep,
  isOnboardingComplete,
} from '../steps';

describe('ONBOARDING_STEPS', () => {
  it('has exactly 5 steps', () => {
    expect(ONBOARDING_STEPS).toHaveLength(5);
    expect(ONBOARDING_TOTAL_STEPS).toBe(5);
  });

  it('steps are numbered 1-5 consecutively', () => {
    ONBOARDING_STEPS.forEach((s, i) => {
      expect(s.step).toBe(i + 1);
    });
  });

  it('step 1 isComplete when profile exists with a goal', () => {
    expect(ONBOARDING_STEPS[0]?.isComplete({ goal: 'maintain' })).toBe(true);
    expect(ONBOARDING_STEPS[0]?.isComplete({ goal: 'cut' })).toBe(true);
    expect(ONBOARDING_STEPS[0]?.isComplete({})).toBe(false);
    expect(ONBOARDING_STEPS[0]?.isComplete(null)).toBe(false);
  });

  it('step 2 isComplete only when all body fields are set', () => {
    const full = {
      height_cm: 175,
      weight_kg: 80,
      birthdate: '1990-01-01',
      sex: 'male' as const,
      activity_level: 'moderate' as const,
    };
    expect(ONBOARDING_STEPS[1]?.isComplete(full)).toBe(true);
    expect(ONBOARDING_STEPS[1]?.isComplete({ ...full, birthdate: undefined })).toBe(false);
    expect(ONBOARDING_STEPS[1]?.isComplete({ ...full, height_cm: undefined })).toBe(false);
  });

  it('step 3 isComplete only when targets.kcal > 0', () => {
    expect(
      ONBOARDING_STEPS[2]?.isComplete({
        targets: { kcal: 2000, protein_g: 150, carbs_g: 220, fat_g: 55 },
      }),
    ).toBe(true);
    expect(
      ONBOARDING_STEPS[2]?.isComplete({
        targets: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      }),
    ).toBe(false);
    expect(ONBOARDING_STEPS[2]?.isComplete({})).toBe(false);
    expect(ONBOARDING_STEPS[2]?.isComplete(null)).toBe(false);
  });
});

describe('firstIncompleteStep', () => {
  it('returns step 1 for a null profile', () => {
    expect(firstIncompleteStep(null)?.step).toBe(1);
  });

  it('returns step 1 for an empty profile', () => {
    expect(firstIncompleteStep({})?.step).toBe(1);
  });

  it('returns step 2 when goal is set but body data is missing', () => {
    expect(firstIncompleteStep({ goal: 'maintain' })?.step).toBe(2);
  });

  it('returns step 3 when body data set but targets not confirmed', () => {
    const partial = {
      goal: 'cut' as const,
      height_cm: 175,
      weight_kg: 80,
      birthdate: '1990-01-01',
      sex: 'male' as const,
      activity_level: 'moderate' as const,
      targets: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    };
    expect(firstIncompleteStep(partial)?.step).toBe(3);
  });

  it('returns null when all essential steps are complete', () => {
    const complete = {
      goal: 'bulk' as const,
      height_cm: 180,
      weight_kg: 90,
      birthdate: '1995-03-20',
      sex: 'male' as const,
      activity_level: 'active' as const,
      targets: { kcal: 3000, protein_g: 198, carbs_g: 338, fat_g: 83 },
    };
    expect(firstIncompleteStep(complete)).toBeNull();
  });
});

describe('isOnboardingComplete', () => {
  it('returns false for null profile', () => {
    expect(isOnboardingComplete(null)).toBe(false);
  });

  it('returns true when goal + body data + targets all set', () => {
    const complete = {
      goal: 'bulk' as const,
      height_cm: 180,
      weight_kg: 90,
      birthdate: '1995-03-20',
      sex: 'male' as const,
      activity_level: 'active' as const,
      targets: { kcal: 3000, protein_g: 198, carbs_g: 338, fat_g: 83 },
    };
    expect(isOnboardingComplete(complete)).toBe(true);
  });

  it('returns false when targets are missing', () => {
    const almostComplete = {
      goal: 'maintain' as const,
      height_cm: 180,
      weight_kg: 90,
      birthdate: '1995-03-20',
      sex: 'male' as const,
      activity_level: 'active' as const,
      targets: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    };
    expect(isOnboardingComplete(almostComplete)).toBe(false);
  });
});
