'use server';

import type { Recipe } from '@/contracts/zod/recipe';
import type { MealCandidate } from '@/contracts/zod/recommendation';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/require-user';
import type { ActionResult } from '@/server/contracts';
import { ServerError } from '@/server/contracts';
import {
  type CookedLogEntry,
  dbDeleteRecipe,
  dbGetRecentCookTitles,
  dbGetRecipe,
  dbInsertCookedLog,
  dbInsertRecipe,
  dbListCookedLog,
  dbListSavedRecipes,
  dbSetSaved,
} from './repo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map MealCandidate (engine output) -> Recipe DB row shape. */
function candidateToRecipeRow(
  candidate: MealCandidate,
  userId: string,
  source: 'recommendation' | 'manual',
  generatedRunId?: string | null,
): Omit<Recipe, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    title: candidate.title,
    description: candidate.oneLineWhy,
    ingredients: candidate.ingredients,
    steps: candidate.steps,
    macros: {
      kcal: candidate.estMacros.kcal,
      protein_g: candidate.estMacros.protein_g,
      carbs_g: candidate.estMacros.carbs_g,
      fat_g: candidate.estMacros.fat_g,
    },
    servings: candidate.servings,
    total_minutes: candidate.totalMinutes,
    cuisine: candidate.cuisine ?? null,
    tags: candidate.tags ?? [],
    source: source === 'recommendation' ? 'ai-generated' : 'user-saved',
    generated_run_id: generatedRunId ?? null,
    saved: true,
  };
}

function toServerError(err: unknown, fallback = 'Unexpected error'): ServerError {
  if (err instanceof ServerError) return err;
  if (err instanceof Error) return new ServerError('internal', err.message, err);
  return new ServerError('internal', fallback, err);
}

// ---------------------------------------------------------------------------
// Exported server actions — T8 contract
// ---------------------------------------------------------------------------

/**
 * Persist a MealCandidate to the `recipes` table.
 *
 * **T8 contract:** called from MealCard with `(candidate)` only — source defaults
 * to 'recommendation' since Feed Me always passes engine output. The `manual`
 * source path is still available for forms that build a candidate by hand.
 */
export async function saveRecipe(
  candidate: MealCandidate,
  source: 'recommendation' | 'manual' = 'recommendation',
  generatedRunId?: string | null,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await requireUser();
    const supabase = await createServerClient();
    const row = candidateToRecipeRow(candidate, userId, source, generatedRunId);
    const id = await dbInsertRecipe(supabase, row);
    return { ok: true, value: { id } };
  } catch (err) {
    return { ok: false, error: toServerError(err, 'Failed to save recipe') };
  }
}

/**
 * Un-save a recipe (keeps the row, sets saved=false).
 * Use deleteRecipe for a hard delete.
 */
export async function unsaveRecipe(id: string): Promise<void> {
  const { userId } = await requireUser();
  const supabase = await createServerClient();
  await dbSetSaved(supabase, id, userId, false);
}

/**
 * Hard-delete a recipe row. RLS enforces ownership; the userId filter in the
 * repo is defense-in-depth.
 */
export async function deleteRecipe(id: string): Promise<void> {
  const { userId } = await requireUser();
  const supabase = await createServerClient();
  await dbDeleteRecipe(supabase, id, userId);
}

/** Fetch a single recipe. Returns null if not found or not owned by current user (RLS). */
export async function getRecipe(id: string): Promise<Recipe | null> {
  await requireUser();
  const supabase = await createServerClient();
  return dbGetRecipe(supabase, id);
}

/** List all saved recipes for the current user, newest first. */
export async function listSavedRecipes(): Promise<Recipe[]> {
  const { userId } = await requireUser();
  const supabase = await createServerClient();
  return dbListSavedRecipes(supabase, userId);
}

/**
 * **T8 contract:** mark a candidate as cooked.
 *
 * Feed Me cards are MealCandidates that may not have a recipe row yet, so this
 * action persists the candidate (saved=true) before inserting the cooked_log
 * entry. This means "I cooked this" implicitly saves the recipe — matching the
 * UX intent that you'd want to see something you just made in Saved.
 *
 * For the recipe-detail page (where the recipe row already exists), use
 * `markCookedById` instead.
 */
export async function markCooked(
  candidate: MealCandidate,
  opts?: { note?: string; rating?: 1 | 2 | 3 | 4 | 5 },
): Promise<ActionResult<{ id: string; recipeId: string }>> {
  try {
    const { userId } = await requireUser();
    const supabase = await createServerClient();
    const row = candidateToRecipeRow(candidate, userId, 'recommendation', null);
    const recipeId = await dbInsertRecipe(supabase, row);
    const logId = await dbInsertCookedLog(supabase, {
      user_id: userId,
      recipe_id: recipeId,
      rating: opts?.rating ?? null,
      note: opts?.note ?? null,
    });
    return { ok: true, value: { id: logId, recipeId } };
  } catch (err) {
    return { ok: false, error: toServerError(err, 'Failed to log cooked recipe') };
  }
}

/**
 * Mark an existing recipe as cooked. Used by the recipe detail page where a
 * recipe row already exists; Feed Me uses `markCooked(candidate)` instead.
 */
export async function markCookedById(
  recipeId: string,
  opts?: { note?: string; rating?: 1 | 2 | 3 | 4 | 5 },
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await requireUser();
    const supabase = await createServerClient();
    const logId = await dbInsertCookedLog(supabase, {
      user_id: userId,
      recipe_id: recipeId,
      rating: opts?.rating ?? null,
      note: opts?.note ?? null,
    });
    return { ok: true, value: { id: logId } };
  } catch (err) {
    return { ok: false, error: toServerError(err, 'Failed to log cooked recipe') };
  }
}

/** List cooked-log entries for the current user within the given day window. */
export async function listCookedLog(days = 30): Promise<CookedLogEntry[]> {
  const { userId } = await requireUser();
  const supabase = await createServerClient();
  return dbListCookedLog(supabase, userId, days);
}

/**
 * Returns lowercased, deduped recipe titles cooked since `since` (ISO timestamp).
 *
 * **T8 hand-off:** T8 (Feed Me / engine recency filter) imports this function
 * and passes the result to `recommend(ctx, deps)` as `deps.recentCookTitles`.
 * The engine filters out any candidate whose lowercased title matches an entry here.
 *
 * The `since` parameter is an ISO-8601 timestamp lower bound — T8 derives it from
 * its RECENCY_WINDOW_DAYS constant. Do NOT change the parameter shape without
 * coordinating with T8.
 */
export async function getRecentCookTitles(since: string): Promise<string[]> {
  const { userId } = await requireUser();
  const supabase = await createServerClient();
  return dbGetRecentCookTitles(supabase, userId, since);
}
