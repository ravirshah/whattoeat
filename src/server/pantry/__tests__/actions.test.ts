import type { PantryItem } from '@/contracts/zod/pantry';
import { describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted constants (available inside vi.mock factory closures)
// ---------------------------------------------------------------------------

const { SAMPLE_ITEM } = vi.hoisted(() => {
  const item: PantryItem = {
    id: '00000000-0000-0000-0000-000000000099',
    user_id: '00000000-0000-0000-0000-000000000001',
    name: 'chicken breast',
    display_name: 'Chicken Breast',
    category: 'protein',
    available: true,
    added_at: new Date().toISOString(),
  };
  return { SAMPLE_ITEM: item };
});

// ---------------------------------------------------------------------------
// Mock requireUser (Track 4 is merged — but we still stub to avoid cookies())
// ---------------------------------------------------------------------------

vi.mock('@/server/auth', () => ({
  requireUser: vi.fn().mockResolvedValue({
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'test@example.com',
  }),
}));

// We mock the repo module so actions.test.ts doesn't need a real DB.
vi.mock('@/server/pantry/repo', () => ({
  listForUser: vi.fn().mockResolvedValue([SAMPLE_ITEM]),
  addItem: vi.fn().mockResolvedValue(SAMPLE_ITEM),
  updateItem: vi.fn().mockResolvedValue({ ...SAMPLE_ITEM, available: false }),
  removeItem: vi.fn().mockResolvedValue(undefined),
  bulkAddItems: vi.fn().mockResolvedValue([SAMPLE_ITEM]),
}));

// We also mock createServerClient so actions don't need env vars in test.
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

// ---------------------------------------------------------------------------
// Import actions after mocks are registered
// ---------------------------------------------------------------------------

import {
  addPantryItem,
  bulkAddPantryItems,
  removePantryItem,
  setPantryItem,
  togglePantryItem,
} from '@/server/pantry/actions';

// ---------------------------------------------------------------------------
// addPantryItem
// ---------------------------------------------------------------------------

describe('addPantryItem', () => {
  it('returns ok:true with the created item', async () => {
    const result = await addPantryItem({ name: 'chicken breast', category: 'protein' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('chicken breast');
    }
  });

  it('returns ok:false when repo throws', async () => {
    const { addItem } = await import('@/server/pantry/repo');
    vi.mocked(addItem).mockRejectedValueOnce(new Error('DB error'));
    const result = await addPantryItem({ name: 'eggs', category: 'protein' });
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// togglePantryItem
// ---------------------------------------------------------------------------

describe('togglePantryItem', () => {
  it('returns ok:true and writes the desired next value', async () => {
    // Caller passes the desired next value (idempotent). SAMPLE_ITEM is
    // available=true, so flipping to false and asserting.
    const result = await togglePantryItem(SAMPLE_ITEM.id, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.available).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// removePantryItem
// ---------------------------------------------------------------------------

describe('removePantryItem', () => {
  it('returns ok:true on success', async () => {
    const result = await removePantryItem(SAMPLE_ITEM.id);
    expect(result.ok).toBe(true);
  });

  it('returns ok:false when repo throws', async () => {
    const { removeItem } = await import('@/server/pantry/repo');
    vi.mocked(removeItem).mockRejectedValueOnce(new Error('DB error'));
    const result = await removePantryItem(SAMPLE_ITEM.id);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setPantryItem
// ---------------------------------------------------------------------------

describe('setPantryItem', () => {
  it('returns ok:true with updated item', async () => {
    const { updateItem } = await import('@/server/pantry/repo');
    vi.mocked(updateItem).mockResolvedValueOnce({ ...SAMPLE_ITEM, display_name: 'Chicken Thigh' });
    const result = await setPantryItem(SAMPLE_ITEM.id, { display_name: 'Chicken Thigh' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.display_name).toBe('Chicken Thigh');
    }
  });
});

// ---------------------------------------------------------------------------
// bulkAddPantryItems
// ---------------------------------------------------------------------------

describe('bulkAddPantryItems', () => {
  it('returns ok:true with array of items', async () => {
    const result = await bulkAddPantryItems(['chicken breast']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value)).toBe(true);
    }
  });
});
