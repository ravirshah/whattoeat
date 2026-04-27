import type { MealCandidate } from '@/contracts/zod';
import type { RecommendationContext } from '@/contracts/zod';
import { SCORE_WEIGHTS, scoreCandidate } from '@/engine/score';
import { describe, expect, test } from 'vitest';

// ---------------------------------------------------------------------------
// Minimal fixture helpers
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<RecommendationContext['profile']> = {}): RecommendationContext {
  return {
    pantry: [],
    profile: {
      user_id: '00000000-0000-0000-0000-000000000001',
      display_name: 'Test',
      goal: 'maintain',
      targets: { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 },
      height_cm: 175,
      weight_kg: 75,
      birthdate: '1990-01-01',
      sex: 'male',
      activity_level: 'moderate',
      dietary_pattern: null,
      allergies: [],
      dislikes: [],
      cuisines: [],
      equipment: [],
      created_at: '2026-04-26T00:00:00.000Z',
      updated_at: '2026-04-26T00:00:00.000Z',
      ...overrides,
    },
    request: { mealType: 'any', candidateCount: 3 },
  };
}

function makeCandidate(overrides: Partial<MealCandidate> = {}): MealCandidate {
  return {
    title: 'Test Meal',
    oneLineWhy: 'Great for testing',
    ingredients: [{ name: 'chicken', qty: 200, unit: 'g', note: null }],
    steps: [{ idx: 1, text: 'Cook it', durationMin: null }],
    estMacros: { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 },
    servings: 1,
    totalMinutes: 30,
    cuisine: 'american',
    tags: [],
    pantryCoverage: 0.8,
    missingItems: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SCORE_WEIGHTS', () => {
  test('weights sum to 1', () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});

describe('scoreCandidate — pantry coverage', () => {
  test('higher pantryCoverage yields higher score', () => {
    const ctx = makeCtx();
    const high = scoreCandidate(makeCandidate({ pantryCoverage: 0.9 }), ctx);
    const low = scoreCandidate(makeCandidate({ pantryCoverage: 0.2 }), ctx);
    expect(high).toBeGreaterThan(low);
  });

  test('pantryCoverage = 1 gives max pantry contribution', () => {
    const ctx = makeCtx();
    const score = scoreCandidate(makeCandidate({ pantryCoverage: 1 }), ctx);
    expect(score).toBeGreaterThanOrEqual(SCORE_WEIGHTS.pantry);
  });
});

describe('scoreCandidate — macro alignment (goal: cut)', () => {
  test('candidate within macro targets scores higher than one way over', () => {
    const ctx = makeCtx({
      goal: 'cut',
      targets: { kcal: 1600, protein_g: 140, carbs_g: 130, fat_g: 55 },
    });
    const onTarget = scoreCandidate(
      makeCandidate({ estMacros: { kcal: 1600, protein_g: 140, carbs_g: 130, fat_g: 55 } }),
      ctx,
    );
    const wayOver = scoreCandidate(
      makeCandidate({ estMacros: { kcal: 3000, protein_g: 50, carbs_g: 400, fat_g: 120 } }),
      ctx,
    );
    expect(onTarget).toBeGreaterThan(wayOver);
  });
});

describe('scoreCandidate — time budget', () => {
  test('meal within time budget scores higher than one over budget', () => {
    const ctx: RecommendationContext = {
      ...makeCtx(),
      request: { mealType: 'any', timeBudgetMin: 20, candidateCount: 3 },
    };
    const fast = scoreCandidate(makeCandidate({ totalMinutes: 15 }), ctx);
    const slow = scoreCandidate(makeCandidate({ totalMinutes: 60 }), ctx);
    expect(fast).toBeGreaterThan(slow);
  });

  test('no time budget — totalMinutes does not penalise', () => {
    const ctx = makeCtx();
    const fast = scoreCandidate(makeCandidate({ totalMinutes: 15 }), ctx);
    const slow = scoreCandidate(makeCandidate({ totalMinutes: 60 }), ctx);
    // Without a budget constraint the difference should be negligible
    expect(Math.abs(fast - slow)).toBeLessThan(0.05);
  });
});

describe('scoreCandidate — return range', () => {
  test('score is always in [0, 1]', () => {
    const ctx = makeCtx();
    for (const coverage of [0, 0.5, 1]) {
      for (const kcal of [500, 2000, 5000]) {
        const s = scoreCandidate(
          makeCandidate({
            pantryCoverage: coverage,
            estMacros: { kcal, protein_g: 50, carbs_g: 100, fat_g: 30 },
          }),
          ctx,
        );
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      }
    }
  });
});
