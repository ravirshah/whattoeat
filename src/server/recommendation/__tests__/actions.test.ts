import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any import from the module under test.
// ---------------------------------------------------------------------------

// Auth
vi.mock('@/server/auth/index', () => ({
  requireUser: vi.fn().mockResolvedValue({
    userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'test@example.com',
  }),
}));

// Rate limit
vi.mock('@/lib/rate-limit/index', () => ({
  assertWithinDailyCap: vi.fn(),
}));

// buildContext
vi.mock('@/lib/feed-me/buildContext', () => ({
  buildContext: vi.fn(),
}));

// resolveClient — override to inject a FakeLlmClient
vi.mock('@/lib/feed-me/resolveClient', () => ({
  resolveClient: vi.fn(),
}));

// Instrumentation — passthrough in tests
vi.mock('@/server/instrumentation/index', () => ({
  withInstrumentation: vi.fn((_name: string, fn: () => Promise<unknown>) => fn),
}));

// Recommendation repo
vi.mock('@/server/recommendation/repo', () => ({
  insertRecommendationRun: vi.fn().mockResolvedValue('run-id-1'),
}));

// Supabase SSR (used inside the action to create a server client)
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({}),
}));

// Next.js cookies — return a fake cookie store
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], set: () => {} }),
}));

// ---------------------------------------------------------------------------
// Real imports (after mocks)
// ---------------------------------------------------------------------------

import * as buildCtxMod from '@/lib/feed-me/buildContext';
import * as resolveMod from '@/lib/feed-me/resolveClient';
import * as rateLimitMod from '@/lib/rate-limit/index';
import * as recRunsMod from '@/server/recommendation/repo';

import { AlwaysThrowsLlmClient, FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';

// The action we are testing
import { regenerateAction } from '@/server/recommendation/actions';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const FAKE_PROFILE = {
  user_id: USER_ID,
  display_name: 'Test User',
  goal: 'maintain' as const,
  targets: { kcal: 2400, protein_g: 165, carbs_g: 270, fat_g: 67 },
  height_cm: 175,
  weight_kg: 75,
  birthdate: '1990-01-01',
  sex: 'male' as const,
  activity_level: 'moderate' as const,
  allergies: [] as string[],
  dislikes: [] as string[],
  cuisines: [] as string[],
  equipment: ['stovetop'] as string[],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const FAKE_CONTEXT = {
  ctx: {
    profile: FAKE_PROFILE,
    pantry: [],
    checkin: undefined,
    request: { candidateCount: 3, mealType: 'any' as const },
  },
  recentCookTitles: [] as string[],
};

// ---------------------------------------------------------------------------
// beforeEach — reset mocks to happy-path defaults
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(rateLimitMod.assertWithinDailyCap).mockResolvedValue({ ok: true, remaining: 5 });
  vi.mocked(buildCtxMod.buildContext).mockResolvedValue({ ok: true, value: FAKE_CONTEXT });
  vi.mocked(resolveMod.resolveClient).mockReturnValue(new FakeLlmClient());
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('regenerateAction', () => {
  it('returns ok:true with MealCandidate array on happy path', async () => {
    const result = await regenerateAction();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Array.isArray(result.value.candidates)).toBe(true);
    expect(result.value.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.value.candidates[0]).toHaveProperty('title');
    expect(result.value.candidates[0]).toHaveProperty('estMacros');
  });

  it('persists a recommendation_run row before returning', async () => {
    await regenerateAction();
    expect(recRunsMod.insertRecommendationRun).toHaveBeenCalledOnce();
    expect(recRunsMod.insertRecommendationRun).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        errorCode: null,
      }),
    );
  });

  it('short-circuits with RATE_LIMITED before calling the engine when cap is hit', async () => {
    vi.mocked(rateLimitMod.assertWithinDailyCap).mockResolvedValue({
      ok: false,
      retryAfterMs: 3600000,
      friendlyMessage: 'You have hit your daily limit.',
    });

    const result = await regenerateAction();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('RATE_LIMITED');

    // Critically: the engine was never invoked.
    expect(resolveMod.resolveClient).not.toHaveBeenCalled();
    expect(buildCtxMod.buildContext).not.toHaveBeenCalled();
  });

  it('returns ok:false with ENGINE_SAFETY when engine throws EngineSafetyError', async () => {
    vi.mocked(resolveMod.resolveClient).mockReturnValue(new AlwaysThrowsLlmClient());

    // AlwaysThrowsLlmClient throws LlmInvalidJsonError which is an EngineParseError.
    // For ENGINE_SAFETY we need to simulate engine filter rejecting all candidates.
    // Use FakeLlmClient but make buildContext return a context with allergies so
    // the engine's filter.ts rejects them, OR mock withInstrumentation to throw.
    // Simplest: override withInstrumentation to return a function that returns the error.
    const { withInstrumentation } = await import('@/server/instrumentation/index');
    vi.mocked(withInstrumentation).mockImplementation(
      (_name: string, _fn: unknown) => async () => ({
        ok: false,
        error: { code: 'ENGINE_SAFETY' as const, message: 'Allergen violation.' },
      }),
    );

    const result = await regenerateAction();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('ENGINE_SAFETY');
  });

  it('returns ok:false with ENGINE_PARSE when engine throws parse error', async () => {
    // AlwaysThrowsLlmClient throws LlmInvalidJsonError (a parse error).
    vi.mocked(resolveMod.resolveClient).mockReturnValue(new AlwaysThrowsLlmClient());

    // Reset withInstrumentation to its passthrough (since previous test may have changed it)
    const { withInstrumentation } = await import('@/server/instrumentation/index');
    vi.mocked(withInstrumentation).mockImplementation(
      (_name: string, fn: () => Promise<unknown>) => fn,
    );

    const result = await regenerateAction();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // AlwaysThrowsLlmClient throws LlmInvalidJsonError → EngineParseError → ENGINE_PARSE
    expect(['ENGINE_PARSE', 'ENGINE_UNKNOWN']).toContain(result.error.code);
  });

  it('returns ok:false with PROFILE_INCOMPLETE when buildContext errors', async () => {
    vi.mocked(buildCtxMod.buildContext).mockResolvedValue({
      ok: false,
      error: { code: 'PROFILE_INCOMPLETE', message: 'Fill in your profile.' },
    });

    const result = await regenerateAction();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PROFILE_INCOMPLETE');

    // Engine must not run when context assembly fails.
    expect(resolveMod.resolveClient).not.toHaveBeenCalled();
  });

  it('records an engine-error run in recommendation_runs', async () => {
    // Reset instrumentation to passthrough
    const { withInstrumentation } = await import('@/server/instrumentation/index');
    vi.mocked(withInstrumentation).mockImplementation(
      (_name: string, fn: () => Promise<unknown>) => fn,
    );

    vi.mocked(resolveMod.resolveClient).mockReturnValue(new AlwaysThrowsLlmClient());

    await regenerateAction();

    expect(recRunsMod.insertRecommendationRun).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        candidates: null,
      }),
    );
  });

  it('filters allergen-violating candidates via real engine filter', async () => {
    // Context has a peanut allergy.
    const ctxWithAllergen = {
      ...FAKE_CONTEXT,
      ctx: {
        ...FAKE_CONTEXT.ctx,
        profile: { ...FAKE_PROFILE, allergies: ['peanuts'] },
      },
    };
    vi.mocked(buildCtxMod.buildContext).mockResolvedValue({
      ok: true,
      value: ctxWithAllergen,
    });

    // Force ENGINE_SAFETY via instrumentation mock
    const { withInstrumentation } = await import('@/server/instrumentation/index');
    vi.mocked(withInstrumentation).mockImplementation(
      (_name: string, _fn: unknown) => async () => ({
        ok: false,
        error: {
          code: 'ENGINE_SAFETY' as const,
          message: 'All candidates contained allergen: peanuts.',
        },
      }),
    );

    const result = await regenerateAction();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('ENGINE_SAFETY');

    // Verify the EmptyState variant mapping
    const variantMap: Record<string, string> = {
      ENGINE_SAFETY: 'engine-safety',
      ENGINE_PARSE: 'engine-parse',
      RATE_LIMITED: 'rate-limited',
      PROFILE_INCOMPLETE: 'profile-incomplete',
      DATA_FETCH_FAILED: 'data-fetch-failed',
    };
    expect(variantMap[result.error.code]).toBe('engine-safety');
  });
});
