import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock db — must be before imports
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();

vi.mock('@/db/client', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => mockSelect(),
        }),
      }),
    }),
  },
}));

import { computeWeeklyStats } from '../weekly-stats';

// ---------------------------------------------------------------------------
// Helpers to build fake recommendation_run rows
// ---------------------------------------------------------------------------

function makeRow(opts: {
  daysAgo: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  cuisine?: string | null;
  proteins?: string[];
  empty?: boolean;
}) {
  const date = new Date();
  date.setDate(date.getDate() - opts.daysAgo);

  const candidates = opts.empty
    ? []
    : [
        {
          title: 'Test Meal',
          oneLineWhy: 'Test',
          ingredients: (opts.proteins ?? ['chicken breast']).map((p) => ({
            name: p,
            qty: 200,
            unit: 'g',
            note: null,
          })),
          steps: [{ idx: 1, text: 'Cook', durationMin: 20 }],
          estMacros: {
            kcal: opts.kcal,
            protein_g: opts.protein,
            carbs_g: opts.carbs,
            fat_g: opts.fat,
          },
          servings: 1,
          totalMinutes: 20,
          cuisine: opts.cuisine ?? null,
          tags: [],
          pantryCoverage: 0.8,
          missingItems: [],
        },
      ];

  return {
    id: `run-${Math.random()}`,
    user_id: 'user-123',
    context_snapshot: {},
    candidates,
    model: 'test',
    prompts_version: '1',
    prompt_tokens: 0,
    completion_tokens: 0,
    latency_ms: 100,
    created_at: date,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeWeeklyStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no rows exist', async () => {
    mockSelect.mockResolvedValue([]);
    const result = await computeWeeklyStats('user-123');
    expect(result).toBeNull();
  });

  it('returns null when fewer than 3 distinct days', async () => {
    // 2 runs on day 1, 1 run on day 2 = only 2 distinct days
    mockSelect.mockResolvedValue([
      makeRow({ daysAgo: 1, kcal: 500, protein: 40, carbs: 50, fat: 15 }),
      makeRow({ daysAgo: 1, kcal: 600, protein: 45, carbs: 60, fat: 18 }),
      makeRow({ daysAgo: 2, kcal: 550, protein: 42, carbs: 55, fat: 16 }),
    ]);
    const result = await computeWeeklyStats('user-123');
    expect(result).toBeNull();
  });

  it('returns null when all rows have empty candidates (failed runs)', async () => {
    mockSelect.mockResolvedValue([
      makeRow({ daysAgo: 1, kcal: 0, protein: 0, carbs: 0, fat: 0, empty: true }),
      makeRow({ daysAgo: 2, kcal: 0, protein: 0, carbs: 0, fat: 0, empty: true }),
      makeRow({ daysAgo: 3, kcal: 0, protein: 0, carbs: 0, fat: 0, empty: true }),
    ]);
    const result = await computeWeeklyStats('user-123');
    expect(result).toBeNull();
  });

  it('computes correct mean macros across 5 distinct days', async () => {
    mockSelect.mockResolvedValue([
      makeRow({ daysAgo: 0, kcal: 600, protein: 50, carbs: 60, fat: 20 }),
      makeRow({ daysAgo: 1, kcal: 500, protein: 40, carbs: 50, fat: 15 }),
      makeRow({ daysAgo: 2, kcal: 700, protein: 60, carbs: 70, fat: 25 }),
      makeRow({ daysAgo: 3, kcal: 550, protein: 45, carbs: 55, fat: 18 }),
      makeRow({ daysAgo: 4, kcal: 650, protein: 55, carbs: 65, fat: 22 }),
    ]);

    const result = await computeWeeklyStats('user-123');

    expect(result).not.toBeNull();
    expect(result?.runCount).toBe(5);
    expect(result?.distinctDays).toBe(5);
    expect(result?.meanKcal).toBe(Math.round((600 + 500 + 700 + 550 + 650) / 5));
    expect(result?.meanProtein).toBe(Math.round((50 + 40 + 60 + 45 + 55) / 5));
  });

  it('identifies top cuisine correctly (mode)', async () => {
    mockSelect.mockResolvedValue([
      makeRow({ daysAgo: 0, kcal: 500, protein: 40, carbs: 50, fat: 15, cuisine: 'italian' }),
      makeRow({ daysAgo: 1, kcal: 500, protein: 40, carbs: 50, fat: 15, cuisine: 'italian' }),
      makeRow({ daysAgo: 2, kcal: 500, protein: 40, carbs: 50, fat: 15, cuisine: 'american' }),
      makeRow({ daysAgo: 3, kcal: 500, protein: 40, carbs: 50, fat: 15, cuisine: 'italian' }),
      makeRow({ daysAgo: 4, kcal: 500, protein: 40, carbs: 50, fat: 15, cuisine: 'asian' }),
    ]);

    const result = await computeWeeklyStats('user-123');

    expect(result).not.toBeNull();
    expect(result?.topCuisine).toBe('italian');
  });

  it('identifies repeated protein correctly', async () => {
    mockSelect.mockResolvedValue([
      makeRow({
        daysAgo: 0,
        kcal: 500,
        protein: 40,
        carbs: 50,
        fat: 15,
        proteins: ['chicken breast'],
      }),
      makeRow({
        daysAgo: 1,
        kcal: 500,
        protein: 40,
        carbs: 50,
        fat: 15,
        proteins: ['chicken thigh'],
      }),
      makeRow({
        daysAgo: 2,
        kcal: 500,
        protein: 40,
        carbs: 50,
        fat: 15,
        proteins: ['chicken breast'],
      }),
      makeRow({
        daysAgo: 3,
        kcal: 500,
        protein: 40,
        carbs: 50,
        fat: 15,
        proteins: ['salmon fillet'],
      }),
      makeRow({
        daysAgo: 4,
        kcal: 500,
        protein: 40,
        carbs: 50,
        fat: 15,
        proteins: ['chicken breast'],
      }),
    ]);

    const result = await computeWeeklyStats('user-123');

    expect(result).not.toBeNull();
    // 'chicken' appears in all 5 (chicken breast x3, chicken thigh x1)
    // salmon appears in 1
    expect(result?.repeatedProteinName).toBe('chicken');
    expect(result?.repeatedProteinCount).toBeGreaterThanOrEqual(3);
  });

  it('returns null cuisine when all candidates have null cuisine', async () => {
    mockSelect.mockResolvedValue([
      makeRow({ daysAgo: 0, kcal: 500, protein: 40, carbs: 50, fat: 15, cuisine: null }),
      makeRow({ daysAgo: 1, kcal: 500, protein: 40, carbs: 50, fat: 15, cuisine: null }),
      makeRow({ daysAgo: 2, kcal: 500, protein: 40, carbs: 50, fat: 15, cuisine: null }),
      makeRow({ daysAgo: 3, kcal: 500, protein: 40, carbs: 50, fat: 15, cuisine: null }),
    ]);

    const result = await computeWeeklyStats('user-123');

    expect(result).not.toBeNull();
    expect(result?.topCuisine).toBeNull();
  });
});
