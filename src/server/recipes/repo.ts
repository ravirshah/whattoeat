import type { Recipe } from '@/contracts/zod/recipe';
import type { SupabaseClient } from '@supabase/supabase-js';

// Shape returned by cooked_log joins — not the full DB row.
export interface CookedLogEntry {
  id: string;
  recipe_id: string;
  cooked_at: string;
  rating: number | null;
  note: string | null;
  recipe: Pick<Recipe, 'id' | 'title' | 'macros' | 'total_minutes' | 'cuisine'>;
}

// ---------------------------------------------------------------------------
// Recipe CRUD
// ---------------------------------------------------------------------------

export async function dbGetRecipe(supabase: SupabaseClient, id: string): Promise<Recipe | null> {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data as Recipe;
}

export async function dbInsertRecipe(
  supabase: SupabaseClient,
  recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>,
): Promise<string> {
  const { data, error } = await supabase.from('recipes').insert(recipe).select('id').single();
  if (error || !data) throw new Error(`dbInsertRecipe failed: ${error?.message}`);
  return data.id as string;
}

export async function dbListSavedRecipes(
  supabase: SupabaseClient,
  userId: string,
): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .eq('saved', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`dbListSavedRecipes failed: ${error.message}`);
  return (data ?? []) as Recipe[];
}

// userId filters here are application-layer defense-in-depth. RLS already
// scopes recipes to the owner via auth.uid(), but if an RLS policy ever
// regresses (e.g. someone widens it during a migration), the explicit filter
// stops a cross-user mutation cold.
export async function dbSetSaved(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  saved: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .update({ saved, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(`dbSetSaved failed: ${error.message}`);
}

// TODO: confirm with user — hard delete chosen for now. If soft-delete is preferred,
// add a `deleted_at timestamptz` column in a Track 0 migration and flip to
// `.update({ deleted_at: new Date().toISOString() })` here.
export async function dbDeleteRecipe(
  supabase: SupabaseClient,
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`dbDeleteRecipe failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Cooked log
// ---------------------------------------------------------------------------

export async function dbInsertCookedLog(
  supabase: SupabaseClient,
  entry: { user_id: string; recipe_id: string; rating?: number | null; note?: string | null },
): Promise<string> {
  const { data, error } = await supabase
    .from('cooked_log')
    .insert({
      ...entry,
      cooked_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`dbInsertCookedLog failed: ${error?.message}`);
  return data.id as string;
}

export async function dbListCookedLog(
  supabase: SupabaseClient,
  userId: string,
  days: number,
): Promise<CookedLogEntry[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('cooked_log')
    .select(
      'id, recipe_id, cooked_at, rating, note, recipe:recipes(id, title, macros, total_minutes, cuisine)',
    )
    .eq('user_id', userId)
    .gte('cooked_at', since)
    .order('cooked_at', { ascending: false });
  if (error) throw new Error(`dbListCookedLog failed: ${error.message}`);
  return (data ?? []) as unknown as CookedLogEntry[];
}

// Used by T8 engine recency filter.
export async function dbGetRecentCookTitles(
  supabase: SupabaseClient,
  userId: string,
  since: string, // ISO timestamp lower bound
): Promise<string[]> {
  const { data, error } = await supabase
    .from('cooked_log')
    .select('recipe:recipes(title)')
    .eq('user_id', userId)
    .gte('cooked_at', since);
  if (error) throw new Error(`dbGetRecentCookTitles failed: ${error.message}`);
  const titles = (data ?? [])
    .map((row: unknown) => (row as { recipe?: { title?: string } | null })?.recipe?.title)
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.toLowerCase());
  // Deduplicate
  return [...new Set(titles)];
}
