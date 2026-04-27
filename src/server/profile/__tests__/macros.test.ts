import type { Profile } from '@/contracts/zod/profile';
import { computeTargets } from '@/lib/macros';
import { describe, expect, it } from 'vitest';

/** Minimal valid profile shape for testing */
function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    user_id: '00000000-0000-0000-0000-000000000001',
    display_name: 'Test User',
    goal: 'maintain',
    targets: { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 55 },
    height_cm: 175,
    weight_kg: 80,
    birthdate: '1990-01-01',
    sex: 'male',
    activity_level: 'moderate',
    dietary_pattern: null,
    allergies: [],
    dislikes: [],
    cuisines: [],
    equipment: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('computeTargets', () => {
  // ── Null-safety ──────────────────────────────────────────────────────────
  it('returns null when height_cm is null', () => {
    expect(computeTargets(makeProfile({ height_cm: null }))).toBeNull();
  });
  it('returns null when weight_kg is null', () => {
    expect(computeTargets(makeProfile({ weight_kg: null }))).toBeNull();
  });
  it('returns null when birthdate is null', () => {
    expect(computeTargets(makeProfile({ birthdate: null }))).toBeNull();
  });

  // ── Mifflin-St Jeor BMR ──────────────────────────────────────────────────
  it('computes correct BMR for male 80 kg / 175 cm / 36 yrs, moderate, maintain', () => {
    const result = computeTargets(makeProfile({ birthdate: '1990-04-26' }));
    expect(result).not.toBeNull();
    expect(result?.kcal).toBeGreaterThan(2600);
    expect(result?.kcal).toBeLessThan(2730);
  });

  it('computes correct BMR for female 60 kg / 165 cm / 30 yrs, moderate, maintain', () => {
    const result = computeTargets(
      makeProfile({
        weight_kg: 60,
        height_cm: 165,
        birthdate: '1996-04-26',
        sex: 'female',
      }),
    );
    expect(result).not.toBeNull();
    expect(result?.kcal).toBeGreaterThan(2000);
    expect(result?.kcal).toBeLessThan(2100);
  });

  it('treats "other" sex same as male formula', () => {
    const male = computeTargets(makeProfile({ sex: 'male' }));
    const other = computeTargets(makeProfile({ sex: 'other' }));
    expect(male?.kcal).toBe(other?.kcal);
  });

  it('treats "prefer_not_to_say" sex same as male formula', () => {
    const male = computeTargets(makeProfile({ sex: 'male' }));
    const pnts = computeTargets(makeProfile({ sex: 'prefer_not_to_say' }));
    expect(male?.kcal).toBe(pnts?.kcal);
  });

  // ── Activity factors ─────────────────────────────────────────────────────
  it('sedentary factor 1.2 produces lower kcal than moderate 1.55', () => {
    const sed = computeTargets(makeProfile({ activity_level: 'sedentary' }));
    const mod = computeTargets(makeProfile({ activity_level: 'moderate' }));
    if (!sed || !mod) throw new Error('Expected non-null results');
    expect(sed.kcal).toBeLessThan(mod.kcal);
  });

  it('very_active factor 1.9 produces highest kcal of all levels', () => {
    const va = computeTargets(makeProfile({ activity_level: 'very_active' }));
    const active = computeTargets(makeProfile({ activity_level: 'active' }));
    if (!va || !active) throw new Error('Expected non-null results');
    expect(va.kcal).toBeGreaterThan(active.kcal);
  });

  it('light activity (1.375) is between sedentary and moderate', () => {
    const sed = computeTargets(makeProfile({ activity_level: 'sedentary' }));
    const light = computeTargets(makeProfile({ activity_level: 'light' }));
    const mod = computeTargets(makeProfile({ activity_level: 'moderate' }));
    if (!sed || !light || !mod) throw new Error('Expected non-null results');
    expect(light.kcal).toBeGreaterThan(sed.kcal);
    expect(light.kcal).toBeLessThan(mod.kcal);
  });

  // ── Goal adjustments ─────────────────────────────────────────────────────
  it('cut reduces kcal by ~20% vs maintain', () => {
    const maintain = computeTargets(makeProfile({ goal: 'maintain' }));
    const cut = computeTargets(makeProfile({ goal: 'cut' }));
    if (!maintain || !cut) throw new Error('Expected non-null results');
    expect(cut.kcal).toBeCloseTo(maintain.kcal * 0.8, -1);
  });

  it('bulk increases kcal by ~15% vs maintain', () => {
    const maintain = computeTargets(makeProfile({ goal: 'maintain' }));
    const bulk = computeTargets(makeProfile({ goal: 'bulk' }));
    if (!maintain || !bulk) throw new Error('Expected non-null results');
    expect(bulk.kcal).toBeCloseTo(maintain.kcal * 1.15, -1);
  });

  // ── Macro split ──────────────────────────────────────────────────────────
  it('protein is 1 g per lb body weight (80 kg ≈ 176 lb → 176 g)', () => {
    const result = computeTargets(makeProfile({ weight_kg: 80 }));
    expect(result?.protein_g).toBe(176);
  });

  it('protein is capped at 250 g for very heavy subjects', () => {
    const result = computeTargets(makeProfile({ weight_kg: 150 }));
    expect(result?.protein_g).toBeLessThanOrEqual(250);
  });

  it('fat is approximately 25% of kcal', () => {
    const result = computeTargets(makeProfile());
    if (result === null) throw new Error('Expected non-null result');
    const fatKcal = result.fat_g * 9;
    const ratio = fatKcal / result.kcal;
    expect(ratio).toBeGreaterThan(0.22);
    expect(ratio).toBeLessThan(0.28);
  });

  it('macro calories sum to approximately total kcal (within ±10)', () => {
    const result = computeTargets(makeProfile());
    if (result === null) throw new Error('Expected non-null result');
    const sum = result.protein_g * 4 + result.carbs_g * 4 + result.fat_g * 9;
    expect(Math.abs(sum - result.kcal)).toBeLessThan(10);
  });

  it('carbs are non-negative even on aggressive cut with high protein', () => {
    const result = computeTargets(
      makeProfile({ goal: 'cut', weight_kg: 120, activity_level: 'sedentary' }),
    );
    expect(result?.carbs_g).toBeGreaterThanOrEqual(0);
  });

  // ── kcal guard ───────────────────────────────────────────────────────────
  it('throws when computed kcal is <= 0 (extreme cut on near-zero BMR)', () => {
    // Craft a profile where Mifflin yields negative TDEE * goal adjustment:
    // Very low weight (1 kg), very low height (1 cm), very old age → huge negative BMR,
    // then cut factor 0.8 → still negative → kcal rounds to <= 0.
    const extreme = makeProfile({
      weight_kg: 1,
      height_cm: 1,
      birthdate: '1900-01-01', // ~126 yrs old
      activity_level: 'sedentary',
      goal: 'cut',
    });
    expect(() => computeTargets(extreme)).toThrow('kcal must be positive to compute macro split');
  });
});
