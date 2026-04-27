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
  markCookedById,
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

describe('saveRecipe — T8 contract', () => {
  it('returns { ok: true, value: { id } } and calls dbInsertRecipe', async () => {
    vi.mocked(repo.dbInsertRecipe).mockResolvedValueOnce('new-uuid');
    const result = await saveRecipe(FAKE_CANDIDATE);
    expect(repo.dbInsertRecipe).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, value: { id: 'new-uuid' } });
  });

  it('defaults source to "recommendation" when not provided', async () => {
    vi.mocked(repo.dbInsertRecipe).mockResolvedValueOnce('uuid-2');
    await saveRecipe(FAKE_CANDIDATE);
    const inserted = vi.mocked(repo.dbInsertRecipe).mock.calls[0][1];
    expect(inserted.source).toBe('ai-generated');
  });

  it('honours explicit source="manual" → recipe.source="user-saved"', async () => {
    vi.mocked(repo.dbInsertRecipe).mockResolvedValueOnce('uuid-3');
    await saveRecipe(FAKE_CANDIDATE, 'manual');
    const inserted = vi.mocked(repo.dbInsertRecipe).mock.calls[0][1];
    expect(inserted.source).toBe('user-saved');
  });

  it('maps MealCandidate.estMacros -> Recipe.macros correctly', async () => {
    vi.mocked(repo.dbInsertRecipe).mockResolvedValueOnce('new-uuid');
    await saveRecipe(FAKE_CANDIDATE);
    const inserted = vi.mocked(repo.dbInsertRecipe).mock.calls[0][1];
    expect(inserted.macros).toEqual({
      kcal: 350,
      protein_g: 35,
      carbs_g: 5,
      fat_g: 18,
    });
  });

  it('returns { ok: false, error } when dbInsertRecipe throws', async () => {
    vi.mocked(repo.dbInsertRecipe).mockRejectedValueOnce(new Error('DB down'));
    const result = await saveRecipe(FAKE_CANDIDATE);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('DB down');
    }
  });
});

describe('unsaveRecipe', () => {
  it('calls dbSetSaved(false)', async () => {
    vi.mocked(repo.dbSetSaved).mockResolvedValueOnce(undefined);
    await unsaveRecipe('recipe-id');
    expect(repo.dbSetSaved).toHaveBeenCalledWith(expect.anything(), 'recipe-id', 'user-aaa', false);
  });
});

describe('deleteRecipe', () => {
  it('calls dbDeleteRecipe with userId', async () => {
    vi.mocked(repo.dbDeleteRecipe).mockResolvedValueOnce(undefined);
    await deleteRecipe('recipe-id');
    expect(repo.dbDeleteRecipe).toHaveBeenCalledWith(expect.anything(), 'recipe-id', 'user-aaa');
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

describe('markCooked — T8 contract', () => {
  it('persists the candidate then logs it cooked, returning { ok, recipeId, id }', async () => {
    vi.mocked(repo.dbInsertRecipe).mockResolvedValueOnce('recipe-uuid');
    vi.mocked(repo.dbInsertCookedLog).mockResolvedValueOnce('log-uuid');
    const result = await markCooked(FAKE_CANDIDATE);
    expect(result).toEqual({ ok: true, value: { id: 'log-uuid', recipeId: 'recipe-uuid' } });
    expect(repo.dbInsertRecipe).toHaveBeenCalledOnce();
    expect(repo.dbInsertCookedLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ recipe_id: 'recipe-uuid', user_id: 'user-aaa' }),
    );
  });

  it('passes rating + note through to dbInsertCookedLog', async () => {
    vi.mocked(repo.dbInsertRecipe).mockResolvedValueOnce('recipe-uuid');
    vi.mocked(repo.dbInsertCookedLog).mockResolvedValueOnce('log-uuid');
    await markCooked(FAKE_CANDIDATE, { rating: 5, note: 'banger' });
    expect(repo.dbInsertCookedLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rating: 5, note: 'banger' }),
    );
  });

  it('returns { ok: false } if recipe insert fails (no log row created)', async () => {
    vi.mocked(repo.dbInsertRecipe).mockRejectedValueOnce(new Error('DB error'));
    const result = await markCooked(FAKE_CANDIDATE);
    expect(result.ok).toBe(false);
    expect(repo.dbInsertCookedLog).not.toHaveBeenCalled();
  });
});

describe('markCookedById — recipe-detail contract', () => {
  it('inserts cooked_log against existing recipeId without re-saving', async () => {
    vi.mocked(repo.dbInsertCookedLog).mockResolvedValueOnce('log-uuid');
    const result = await markCookedById('existing-recipe', { rating: 4 });
    expect(result).toEqual({ ok: true, value: { id: 'log-uuid' } });
    expect(repo.dbInsertRecipe).not.toHaveBeenCalled();
    expect(repo.dbInsertCookedLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ recipe_id: 'existing-recipe', rating: 4 }),
    );
  });

  it('returns { ok: false } when dbInsertCookedLog throws', async () => {
    vi.mocked(repo.dbInsertCookedLog).mockRejectedValueOnce(new Error('FK violation'));
    const result = await markCookedById('bad-id');
    expect(result.ok).toBe(false);
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
  it('passes the ISO `since` argument straight through to the repo', async () => {
    vi.mocked(repo.dbGetRecentCookTitles).mockResolvedValueOnce([]);
    const since = '2026-04-19T00:00:00.000Z';
    await getRecentCookTitles(since);
    expect(repo.dbGetRecentCookTitles).toHaveBeenCalledWith(expect.anything(), 'user-aaa', since);
  });

  it('returns the titles produced by the repo', async () => {
    vi.mocked(repo.dbGetRecentCookTitles).mockResolvedValueOnce([
      'salmon teriyaki',
      'chicken stir-fry',
    ]);
    const titles = await getRecentCookTitles('2026-04-19T00:00:00.000Z');
    expect(titles).toEqual(['salmon teriyaki', 'chicken stir-fry']);
  });
});
