import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/server/auth/index', () => ({
  requireUser: vi.fn().mockResolvedValue({
    userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'test@example.com',
  }),
}));

vi.mock('@/server/recommendation/repo', () => ({
  getRecommendationRun: vi.fn(),
  insertRecommendationRun: vi.fn().mockResolvedValue('run-id-1'),
}));

vi.mock('@/lib/feed-me/resolveClient', () => ({
  resolveClient: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({}),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], set: () => {} }),
}));

// ---------------------------------------------------------------------------
// Real imports
// ---------------------------------------------------------------------------

import type { MealCandidate } from '@/contracts/zod/recommendation';
import type { RecommendationContext } from '@/contracts/zod/recommendation';
import { FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import type { DetailResponse } from '@/engine/prompt';
import * as resolveMod from '@/lib/feed-me/resolveClient';
import { modifyRecipe } from '@/server/recommendation/modify';
import * as repoMod from '@/server/recommendation/repo';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const RUN_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const FAKE_CANDIDATE: MealCandidate = {
  title: 'Grilled Chicken & Rice',
  oneLineWhy: 'High protein for your cut.',
  ingredients: [
    { name: 'chicken breast', qty: 200, unit: 'g', note: null },
    { name: 'white rice', qty: 150, unit: 'g', note: null },
  ],
  steps: [
    { idx: 1, text: 'Season chicken.', durationMin: 2 },
    { idx: 2, text: 'Grill chicken.', durationMin: 15 },
    { idx: 3, text: 'Cook rice.', durationMin: 20 },
  ],
  estMacros: { kcal: 500, protein_g: 45, carbs_g: 50, fat_g: 10 },
  servings: 1,
  totalMinutes: 25,
  cuisine: 'american',
  tags: ['high-protein'],
  pantryCoverage: 0.9,
  missingItems: [],
};

const FAKE_PROFILE = {
  user_id: USER_ID,
  display_name: 'Test User',
  goal: 'cut' as const,
  targets: { kcal: 1600, protein_g: 150, carbs_g: 130, fat_g: 50 },
  height_cm: 175,
  weight_kg: 75,
  birthdate: '1990-01-01',
  sex: 'male' as const,
  activity_level: 'moderate' as const,
  dietary_pattern: null,
  allergies: [] as string[],
  dislikes: [] as string[],
  cuisines: [] as string[],
  equipment: ['stovetop'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const FAKE_CONTEXT: RecommendationContext = {
  profile: FAKE_PROFILE,
  pantry: [],
  request: { candidateCount: 3, mealType: 'any' as const },
};

function makeModifiedDetail(overrides: Partial<DetailResponse> = {}): DetailResponse {
  return {
    title: 'Grilled Tofu & Rice',
    oneLineWhy: 'Vegetarian swap keeps protein up.',
    ingredients: [
      { name: 'tofu', qty: 200, unit: 'g', note: null },
      { name: 'white rice', qty: 150, unit: 'g', note: null },
    ],
    steps: [
      { idx: 1, text: 'Press tofu.', durationMin: 5 },
      { idx: 2, text: 'Grill tofu.', durationMin: 10 },
      { idx: 3, text: 'Cook rice.', durationMin: 20 },
    ],
    estMacros: { kcal: 480, protein_g: 35, carbs_g: 52, fat_g: 12 },
    servings: 1,
    totalMinutes: 30,
    cuisine: 'american',
    tags: ['vegetarian', 'high-protein'],
    pantryCoverage: 0.8,
    missingItems: ['tofu'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// beforeEach
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(repoMod.getRecommendationRun).mockResolvedValue({
    candidates: [FAKE_CANDIDATE],
    context: FAKE_CONTEXT,
  });

  vi.mocked(resolveMod.resolveClient).mockReturnValue(
    new FakeLlmClient({
      detail: () => makeModifiedDetail(),
    }),
  );
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('modifyRecipe', () => {
  it('happy path — returns modified MealCandidate', async () => {
    const result = await modifyRecipe({
      runId: RUN_ID,
      candidateIndex: 0,
      instruction: 'Make it vegetarian',
      priorTweaks: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveProperty('title');
    expect(result.value).toHaveProperty('ingredients');
    expect(result.value).toHaveProperty('estMacros');
  });

  it('rejects instruction that is too long (>500 chars)', async () => {
    const result = await modifyRecipe({
      runId: RUN_ID,
      candidateIndex: 0,
      instruction: 'x'.repeat(501),
      priorTweaks: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation_failed');
  });

  it('rejects empty instruction', async () => {
    const result = await modifyRecipe({
      runId: RUN_ID,
      candidateIndex: 0,
      instruction: '',
      priorTweaks: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation_failed');
  });

  it('returns not_found when run does not exist', async () => {
    vi.mocked(repoMod.getRecommendationRun).mockResolvedValue(null);

    const result = await modifyRecipe({
      runId: RUN_ID,
      candidateIndex: 0,
      instruction: 'Make it faster',
      priorTweaks: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('returns engine_safety when allergen is reintroduced', async () => {
    vi.mocked(repoMod.getRecommendationRun).mockResolvedValue({
      candidates: [FAKE_CANDIDATE],
      context: {
        ...FAKE_CONTEXT,
        profile: { ...FAKE_PROFILE, allergies: ['peanut'] },
      },
    });

    vi.mocked(resolveMod.resolveClient).mockReturnValue(
      new FakeLlmClient({
        detail: () =>
          makeModifiedDetail({
            ingredients: [
              { name: 'peanut butter', qty: 30, unit: 'g', note: null },
              { name: 'white rice', qty: 150, unit: 'g', note: null },
            ],
          }),
      }),
    );

    const result = await modifyRecipe({
      runId: RUN_ID,
      candidateIndex: 0,
      instruction: 'Add more protein with peanut butter',
      priorTweaks: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('engine_safety');
    expect(result.error.message).toContain('ALLERGEN_REINTRODUCED');
  });

  it('rejects candidates with >20% kcal drift when not explicitly requested', async () => {
    vi.mocked(resolveMod.resolveClient).mockReturnValue(
      new FakeLlmClient({
        detail: () =>
          makeModifiedDetail({
            estMacros: { kcal: 900, protein_g: 80, carbs_g: 80, fat_g: 20 },
          }),
      }),
    );

    const result = await modifyRecipe({
      runId: RUN_ID,
      candidateIndex: 0,
      instruction: 'Make it tastier',
      priorTweaks: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('engine_failed');
  });

  it('allows kcal drift when instruction explicitly asks for it', async () => {
    vi.mocked(resolveMod.resolveClient).mockReturnValue(
      new FakeLlmClient({
        detail: () =>
          makeModifiedDetail({
            estMacros: { kcal: 250, protein_g: 30, carbs_g: 20, fat_g: 5 },
          }),
      }),
    );

    const result = await modifyRecipe({
      runId: RUN_ID,
      candidateIndex: 0,
      instruction: 'Half the carbs and fewer calories',
      priorTweaks: [],
    });

    expect(result.ok).toBe(true);
  });

  it('returns not_found for candidateIndex out of range', async () => {
    const result = await modifyRecipe({
      runId: RUN_ID,
      candidateIndex: 3,
      instruction: 'Make it faster',
      priorTweaks: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
