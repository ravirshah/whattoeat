'use server';

import { PantryCategory, type PantryItem, PantryItemUpdate } from '@/contracts/zod/pantry';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth';
import type { ActionResult } from '@/server/contracts';
import { ServerError } from '@/server/contracts';
import { addItem, bulkAddItems, removeItem, updateItem } from '@/server/pantry/repo';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Input schemas (validated at the action boundary)
// ---------------------------------------------------------------------------

const AddInput = z.object({
  name: z.string().min(1).max(80),
  category: PantryCategory,
});

const BulkAddInput = z.object({
  names: z.array(z.string().min(1).max(80)).min(1).max(50),
});

// ---------------------------------------------------------------------------
// Helper: build RLS-anon client from the current request cookies
// ---------------------------------------------------------------------------
// The anon client carries the user's session cookie, so Postgres RLS evaluates
// auth.uid() correctly. We never use service-role here.

async function getAnonClient() {
  // createServerClient reads cookies() from the Next.js request context.
  return createServerClient();
}

// ---------------------------------------------------------------------------
// addPantryItem
// ---------------------------------------------------------------------------

export async function addPantryItem(rawInput: { name: string; category: string }): Promise<
  ActionResult<PantryItem>
> {
  try {
    const { userId } = await requireUser();
    const input = AddInput.parse(rawInput);
    const client = await getAnonClient();
    // Normalise name to lowercase for the unique index; display_name keeps user casing.
    const item = await addItem(client, userId, {
      name: input.name.trim().toLowerCase(),
      display_name: input.name.trim(),
      category: input.category,
    });
    return { ok: true, value: item };
  } catch (err) {
    if (err instanceof ServerError) return { ok: false, error: err };
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: new ServerError('validation_failed', err.errors[0]?.message ?? 'Invalid input', err),
      };
    }
    return { ok: false, error: new ServerError('internal', 'Unexpected error', err) };
  }
}

// ---------------------------------------------------------------------------
// togglePantryItem
// ---------------------------------------------------------------------------
// Passes the current available value from the client to avoid an extra round-
// trip. RLS guarantees the row belongs to the authenticated user.

export async function togglePantryItem(
  id: string,
  currentAvailable: boolean,
): Promise<ActionResult<PantryItem>> {
  try {
    const { userId } = await requireUser();
    const client = await getAnonClient();
    const item = await updateItem(client, userId, id, { available: !currentAvailable });
    return { ok: true, value: item };
  } catch (err) {
    if (err instanceof ServerError) return { ok: false, error: err };
    return { ok: false, error: new ServerError('internal', 'Unexpected error', err) };
  }
}

// ---------------------------------------------------------------------------
// removePantryItem
// ---------------------------------------------------------------------------

export async function removePantryItem(id: string): Promise<ActionResult<void>> {
  try {
    const { userId } = await requireUser();
    const client = await getAnonClient();
    await removeItem(client, userId, id);
    return { ok: true, value: undefined };
  } catch (err) {
    if (err instanceof ServerError) return { ok: false, error: err };
    return { ok: false, error: new ServerError('internal', 'Unexpected error', err) };
  }
}

// ---------------------------------------------------------------------------
// setPantryItem — partial update (display_name, category)
// ---------------------------------------------------------------------------

export async function setPantryItem(
  id: string,
  patch: z.infer<typeof PantryItemUpdate>,
): Promise<ActionResult<PantryItem>> {
  try {
    const { userId } = await requireUser();
    const validated = PantryItemUpdate.parse(patch);
    const client = await getAnonClient();
    const item = await updateItem(client, userId, id, validated);
    return { ok: true, value: item };
  } catch (err) {
    if (err instanceof ServerError) return { ok: false, error: err };
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: new ServerError('validation_failed', err.errors[0]?.message ?? 'Invalid patch', err),
      };
    }
    return { ok: false, error: new ServerError('internal', 'Unexpected error', err) };
  }
}

// ---------------------------------------------------------------------------
// bulkAddPantryItems — paste-in / multi-add
// ---------------------------------------------------------------------------

export async function bulkAddPantryItems(names: string[]): Promise<ActionResult<PantryItem[]>> {
  try {
    const { userId } = await requireUser();
    const { names: validatedNames } = BulkAddInput.parse({ names });
    const client = await getAnonClient();
    const items = await bulkAddItems(
      client,
      userId,
      validatedNames.map((n) => ({
        name: n.trim().toLowerCase(),
        display_name: n.trim(),
        // Default category; UI should prompt for category on each item or default to 'other'.
        category: 'other' as const,
      })),
    );
    return { ok: true, value: items };
  } catch (err) {
    if (err instanceof ServerError) return { ok: false, error: err };
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: new ServerError('validation_failed', err.errors[0]?.message ?? 'Invalid names', err),
      };
    }
    return { ok: false, error: new ServerError('internal', 'Unexpected error', err) };
  }
}
