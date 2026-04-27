import type { Profile } from '@/contracts/zod/profile';
import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from '@/engine/ports/llm';
import { describe, expect, it, vi } from 'vitest';
import type { WeeklyStats } from '../weekly-stats';

// Mock resolveClient — we pass llmOverride so this won't be called in these tests
vi.mock('@/lib/feed-me/resolveClient', () => ({
  resolveClient: vi.fn(),
}));

import { generateWeeklyInsight } from '../weekly-insight';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_STATS: WeeklyStats = {
  runCount: 5,
  distinctDays: 5,
  meanKcal: 520,
  meanProtein: 42,
  meanCarbs: 55,
  meanFat: 18,
  topCuisine: 'italian',
  distinctProteins: ['chicken', 'salmon'],
  repeatedProteinCount: 3,
  repeatedProteinName: 'chicken',
};

const FAKE_PROFILE: Profile = {
  user_id: 'user-123',
  display_name: 'Test User',
  goal: 'maintain',
  targets: { kcal: 2200, protein_g: 165, carbs_g: 275, fat_g: 73 },
  height_cm: 175,
  weight_kg: 75,
  birthdate: '1990-01-01',
  sex: 'male',
  activity_level: 'moderate',
  allergies: [],
  dislikes: [],
  cuisines: [],
  equipment: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Fake LLM clients
// ---------------------------------------------------------------------------

class InsightFakeLlmClient implements LlmClient {
  constructor(
    private readonly response: { insight: string; family: 'trend' | 'deficit_surplus' | 'variety' },
  ) {}

  async generateStructured<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    const value = args.schema.parse(this.response) as T;
    return { value, tokens: { prompt: 50, completion: 20 }, modelUsed: 'fake-v1' };
  }
}

class ThrowingLlmClient implements LlmClient {
  async generateStructured<T>(_args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    throw new Error('Simulated LLM failure');
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateWeeklyInsight', () => {
  it('returns ok:true with insight and family from LLM on happy path', async () => {
    const llm = new InsightFakeLlmClient({
      insight: 'Chicken appeared in 3 of your 5 meals this week — Feed Me is mixing it up tonight.',
      family: 'variety',
    });

    const result = await generateWeeklyInsight(FAKE_STATS, FAKE_PROFILE, llm);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.family).toBe('variety');
    expect(result.value.insight).toContain('3');
  });

  it('falls back to deterministic string when LLM throws', async () => {
    const llm = new ThrowingLlmClient();

    const result = await generateWeeklyInsight(FAKE_STATS, FAKE_PROFILE, llm);

    // Fallback path still returns ok:true (it degrades gracefully)
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Fallback contains run count and mean kcal
    expect(result.value.insight).toContain('5');
    expect(result.value.insight).toContain('520');
    expect(result.value.family).toBe('trend');
  });

  it('fallback insight is ≤150 chars', async () => {
    const llm = new ThrowingLlmClient();

    const result = await generateWeeklyInsight(FAKE_STATS, FAKE_PROFILE, llm);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.insight.length).toBeLessThanOrEqual(150);
  });

  it('returns variety family when LLM picks variety', async () => {
    const llm = new InsightFakeLlmClient({
      insight: 'Three dinners this week were chicken-based — try a swap tonight.',
      family: 'variety',
    });

    const result = await generateWeeklyInsight(FAKE_STATS, FAKE_PROFILE, llm);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.family).toBe('variety');
  });

  it('returns trend family when LLM picks trend', async () => {
    const llm = new InsightFakeLlmClient({
      insight: 'Your protein climbed 12% this week — bulk target is within reach.',
      family: 'trend',
    });

    const result = await generateWeeklyInsight(FAKE_STATS, FAKE_PROFILE, llm);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.family).toBe('trend');
  });

  it('returns deficit_surplus family when LLM picks deficit_surplus', async () => {
    const llm = new InsightFakeLlmClient({
      insight: 'Averaging 280kcal under target on training days — worth fuelling more.',
      family: 'deficit_surplus',
    });

    const result = await generateWeeklyInsight(FAKE_STATS, FAKE_PROFILE, llm);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.family).toBe('deficit_surplus');
  });
});
