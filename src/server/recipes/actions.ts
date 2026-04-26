'use server';

import type { Recipe } from '@/contracts/zod/recipe';
import type { MealCandidate } from '@/contracts/zod/recommendation';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/require-user';
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

// ---------------------------------------------------------------------------
// Exported server actions
// ---------------------------------------------------------------------------

/**
 * Persist a MealCandidate from engine output to the `recipes` table.
 * Returns the new recipe UUID.
 */
export async function saveRecipe(
  candidate: MealCandidate,
  source: 'recommendation' | 'manual',
  generatedRunId?: string | null,
): Promise<string> {
  const { userId } = await requireUser();
  const supabase = await createServerClient();
  const row = candidateToRecipeRow(candidate, userId, source, generatedRunId);
  return dbInsertRecipe(supabase, row);
}

/**
 * Un-save a recipe (keeps the row, sets saved=false).
 * Use deleteRecipe for a hard delete.
 */
export async function unsaveRecipe(id: string): Promise<void> {
  await requireUser();
  const supabase = await createServerClient();
  await dbSetSaved(supabase, id, false);
}

/**
 * Hard-delete a recipe row.
 * RLS ensures ownership; the repo passes the call through without an extra userId filter
 * because Supabase RLS handles it. This is intentional — RLS is the enforcement layer.
 *
 * TODO: confirm with user — if soft-delete is preferred, replace with dbSetSaved or
 * a dedicated dbSoftDeleteRecipe that sets deleted_at. Requires a schema column.
 */
export async function deleteRecipe(id: string): Promise<void> {
  await requireUser();
  const supabase = await createServerClient();
  await dbDeleteRecipe(supabase, id);
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
 * Append a cooked_log entry and optionally record a rating + note.
 *
 * TODO: confirm with user — should this also bump a popularity counter on the recipe
 * row? Spec does not define a counter column. Skipped for now; add a
 * `cooked_count int default 0` column + increment in Track 0 if desired.
 */
export async function markCooked(
  recipeId: string,
  opts?: { note?: string; rating?: 1 | 2 | 3 | 4 | 5 },
): Promise<void> {
  const { userId } = await requireUser();
  const supabase = await createServerClient();
  await dbInsertCookedLog(supabase, {
    user_id: userId,
    recipe_id: recipeId,
    rating: opts?.rating ?? null,
    note: opts?.note ?? null,
  });
}

/** List cooked-log entries for the current user within the given day window. */
export async function listCookedLog(days = 30): Promise<CookedLogEntry[]> {
  const { userId } = await requireUser();
  const supabase = await createServerClient();
  return dbListCookedLog(supabase, userId, days);
}

/**
 * Returns lowercased, deduped recipe titles cooked within `daysWindow` days.
 *
 * **T8 hand-off:** T8 (Feed Me / engine recency filter) imports this function
 * and passes the result to `recommend(ctx, deps)` as `deps.recentCookTitles`.
 * The engine filters out any candidate whose lowercased title matches an entry here.
 * Do NOT change the return shape without coordinating with T8.
 */
export async function getRecentCookTitles(daysWindow = 7): Promise<string[]> {
  const { userId } = await requireUser();
  const supabase = await createServerClient();
  const since = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000).toISOString();
  return dbGetRecentCookTitles(supabase, userId, since);
}
