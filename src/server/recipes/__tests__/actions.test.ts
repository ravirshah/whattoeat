import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before imports that use them.
// ---------------------------------------------------------------------------

vi.mock('@/server/auth/require-user', () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: 'user-aaa', email: 'test@example.com' }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

vi.mock('../repo', () => ({
  dbGetRecipe: vi.fn(),
  dbInsertRecipe: vi.fn(),
  dbListSavedRecipes: vi.fn(),
  dbSetSaved: vi.fn(),
  dbDeleteRecipe: vi.fn(),
  dbInsertCookedLog: vi.fn(),
  dbListCookedLog: vi.fn(),
  dbGetRecentCookTitles: vi.fn(),
}));

import type { MealCandidate } from '@/contracts/zod/recommendation';
import {
  deleteRecipe,
  getRecentCookTitles,
  getRecipe,
  listCookedLog,
  listSavedRecipes,
  markCooked,
  saveRecipe,
  unsaveRecipe,
} from '../actions';
import * as repo from '../repo';

// Clear all mocks before each test to prevent cross-test pollution.
beforeEach(() => vi.clearAllMocks());

const FAKE_CANDIDATE: MealCandidate = {
  title: 'Grilled Salmon',
  oneLineWhy: 'High protein, quick cook',
  ingredients: [{ name: 'salmon', qty: 150, unit: 'g', note: null }],
  steps: [{ idx: 1, text: 'Grill for 8 min', durationMin: 8 }],
  estMacros: { kcal: 350, protein_g: 35, carbs_g: 5, fat_g: 18 },
  servings: 1,
  totalMinutes: 12,
  cuisine: 'Mediterranean',
  tags: ['quick', 'healthy'],
  pantryCoverage: 0.85,
  missingItems: ['lemon'],
};

describe('saveRecipe', () => {
  it('calls dbInsertRecipe and returns the new id', async () => {
    vi.mocked(repo.dbInsertRecipe).mockResolvedValueOnce('new-uuid');
    const id = await saveRecipe(FAKE_CANDIDATE, 'recommendation');
    expect(repo.dbInsertRecipe).toHaveBeenCalledOnce();
    expect(id).toBe('new-uuid');
  });

  it('maps MealCandidate.estMacros -> Recipe.macros correctly', async () => {
    vi.mocked(repo.dbInsertRecipe).mockResolvedValueOnce('new-uuid');
    await saveRecipe(FAKE_CANDIDATE, 'recommendation');
    const inserted = vi.mocked(repo.dbInsertRecipe).mock.calls[0][1];
    expect(inserted.macros).toEqual({
      kcal: 350,
      protein_g: 35,
      carbs_g: 5,
      fat_g: 18,
    });
  });
});

describe('unsaveRecipe', () => {
  it('calls dbSetSaved(false)', async () => {
    vi.mocked(repo.dbSetSaved).mockResolvedValueOnce(undefined);
    await unsaveRecipe('recipe-id');
    expect(repo.dbSetSaved).toHaveBeenCalledWith(expect.anything(), 'recipe-id', false);
  });
});

describe('deleteRecipe', () => {
  it('calls dbDeleteRecipe', async () => {
    vi.mocked(repo.dbDeleteRecipe).mockResolvedValueOnce(undefined);
    await deleteRecipe('recipe-id');
    expect(repo.dbDeleteRecipe).toHaveBeenCalledOnce();
  });
});

describe('getRecipe', () => {
  it('returns recipe when found', async () => {
    const fake = { id: 'r1', title: 'Test' };
    vi.mocked(repo.dbGetRecipe).mockResolvedValueOnce(fake as never);
    const result = await getRecipe('r1');
    expect(result).toEqual(fake);
  });

  it('returns null when not found', async () => {
    vi.mocked(repo.dbGetRecipe).mockResolvedValueOnce(null);
    const result = await getRecipe('bad');
    expect(result).toBeNull();
  });
});

describe('listSavedRecipes', () => {
  it('delegates to dbListSavedRecipes with current userId', async () => {
    vi.mocked(repo.dbListSavedRecipes).mockResolvedValueOnce([]);
    const result = await listSavedRecipes();
    expect(repo.dbListSavedRecipes).toHaveBeenCalledWith(expect.anything(), 'user-aaa');
    expect(result).toEqual([]);
  });
});

describe('markCooked', () => {
  it('calls dbInsertCookedLog with rating and note', async () => {
    vi.mocked(repo.dbInsertCookedLog).mockResolvedValueOnce(undefined);
    await markCooked('recipe-id', { note: 'Loved it', rating: 5 });
    expect(repo.dbInsertCookedLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ recipe_id: 'recipe-id', rating: 5, note: 'Loved it' }),
    );
  });

  it('works without options', async () => {
    vi.mocked(repo.dbInsertCookedLog).mockResolvedValueOnce(undefined);
    await markCooked('recipe-id');
    expect(repo.dbInsertCookedLog).toHaveBeenCalledOnce();
  });
});

describe('listCookedLog', () => {
  it('defaults to 30 days', async () => {
    vi.mocked(repo.dbListCookedLog).mockResolvedValueOnce([]);
    await listCookedLog();
    expect(repo.dbListCookedLog).toHaveBeenCalledWith(expect.anything(), 'user-aaa', 30);
  });

  it('accepts custom days', async () => {
    vi.mocked(repo.dbListCookedLog).mockResolvedValueOnce([]);
    await listCookedLog(7);
    expect(repo.dbListCookedLog).toHaveBeenCalledWith(expect.anything(), 'user-aaa', 7);
  });
});

describe('getRecentCookTitles — T8 contract', () => {
  it('returns lowercased, deduped titles from dbGetRecentCookTitles', async () => {
    vi.mocked(repo.dbGetRecentCookTitles).mockResolvedValueOnce([
      'salmon teriyaki',
      'chicken stir-fry',
    ]);
    const titles = await getRecentCookTitles(7);
    expect(titles).toContain('salmon teriyaki');
    expect(titles).toContain('chicken stir-fry');
  });

  it('passes a since timestamp derived from daysWindow', async () => {
    vi.mocked(repo.dbGetRecentCookTitles).mockResolvedValueOnce([]);
    await getRecentCookTitles(14);
    const since = vi.mocked(repo.dbGetRecentCookTitles).mock.calls[0][2];
    // since should be approximately 14 days ago
    const sinceDate = new Date(since);
    const expectedApprox = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(Math.abs(sinceDate.getTime() - expectedApprox.getTime())).toBeLessThan(5000);
  });
});
