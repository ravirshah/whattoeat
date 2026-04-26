import 'server-only';
import { PantryItem } from '@/contracts/zod/pantry';
import type { PantryCategory } from '@/contracts/zod/pantry';
import { ServerError } from '@/server/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Input shape for insert operations (internal to the repo)
// ---------------------------------------------------------------------------

export interface PantryInsertInput {
  name: string;
  display_name: string;
  category: PantryCategory;
}

// ---------------------------------------------------------------------------
// listForUser
// ---------------------------------------------------------------------------

export async function listForUser(client: SupabaseClient, userId: string): Promise<PantryItem[]> {
  const { data, error } = await client
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: true });

  if (error) {
    throw new ServerError('internal', 'Failed to list pantry items', error);
  }

  return (data ?? []).map((row) => PantryItem.parse(row));
}

// ---------------------------------------------------------------------------
// addItem
// ---------------------------------------------------------------------------

export async function addItem(
  client: SupabaseClient,
  userId: string,
  input: PantryInsertInput,
): Promise<PantryItem> {
  const { data, error } = await client
    .from('pantry_items')
    .insert({ ...input, user_id: userId, available: true })
    .select()
    .single();

  if (error || !data) {
    throw new ServerError('internal', 'Failed to add pantry item', error ?? undefined);
  }

  return PantryItem.parse(data);
}

// ---------------------------------------------------------------------------
// updateItem
// ---------------------------------------------------------------------------

export async function updateItem(
  client: SupabaseClient,
  userId: string,
  id: string,
  patch: Partial<{ available: boolean; display_name: string; category: PantryCategory }>,
): Promise<PantryItem> {
  const { data, error } = await client
    .from('pantry_items')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    throw new ServerError('internal', 'Failed to update pantry item', error ?? undefined);
  }

  return PantryItem.parse(data);
}

// ---------------------------------------------------------------------------
// removeItem
// ---------------------------------------------------------------------------

export async function removeItem(
  client: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await client.from('pantry_items').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    throw new ServerError('internal', 'Failed to remove pantry item', error);
  }
}

// ---------------------------------------------------------------------------
// bulkAddItems
// ---------------------------------------------------------------------------

export async function bulkAddItems(
  client: SupabaseClient,
  userId: string,
  inputs: PantryInsertInput[],
): Promise<PantryItem[]> {
  // Sequential for now — avoids overwhelming the DB; can be parallelised later.
  const results: PantryItem[] = [];
  for (const input of inputs) {
    const item = await addItem(client, userId, input);
    results.push(item);
  }
  return results;
}
