import type { PantryItem } from '@/contracts/zod/pantry';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

// The repo module does not exist yet — this import will fail until Task 3.
import { addItem, bulkAddItems, listForUser, removeItem, updateItem } from '@/server/pantry/repo';

// ---------------------------------------------------------------------------
// Minimal Supabase mock
// ---------------------------------------------------------------------------

function makeMockClient(rows: Partial<PantryItem>[] = []) {
  const selectMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }),
  });

  const insertMock = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: rows[0] ?? null, error: null }),
    }),
  });

  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: rows[0] ?? null, error: null }),
        }),
      }),
    }),
  });

  const deleteMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  });

  return {
    from: vi.fn(() => ({
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
    })),
  } as unknown as SupabaseClient;
}

const USER_ID = '00000000-0000-0000-0000-000000000001';

const SAMPLE_ROW: PantryItem = {
  id: '00000000-0000-0000-0000-000000000099',
  user_id: USER_ID,
  name: 'chicken breast',
  display_name: 'Chicken Breast',
  category: 'protein',
  available: true,
  added_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// listForUser
// ---------------------------------------------------------------------------

describe('listForUser', () => {
  it('queries pantry_items filtered by userId', async () => {
    const client = makeMockClient([SAMPLE_ROW]);
    const result = await listForUser(client, USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('chicken breast');
  });

  it('returns empty array when no rows', async () => {
    const client = makeMockClient([]);
    const result = await listForUser(client, USER_ID);
    expect(result).toEqual([]);
  });

  it('throws ServerError on DB error', async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB down') }),
          }),
        }),
      })),
    } as unknown as SupabaseClient;
    await expect(listForUser(client, USER_ID)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// addItem
// ---------------------------------------------------------------------------

describe('addItem', () => {
  it('inserts a row and returns the created PantryItem', async () => {
    const client = makeMockClient([SAMPLE_ROW]);
    const result = await addItem(client, USER_ID, {
      name: 'chicken breast',
      display_name: 'Chicken Breast',
      category: 'protein',
    });
    expect(result.name).toBe('chicken breast');
  });
});

// ---------------------------------------------------------------------------
// updateItem
// ---------------------------------------------------------------------------

describe('updateItem', () => {
  it('flips available and returns updated row', async () => {
    const updated = { ...SAMPLE_ROW, available: false };
    const client = makeMockClient([updated]);
    const result = await updateItem(client, USER_ID, SAMPLE_ROW.id, { available: false });
    expect(result.available).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// removeItem
// ---------------------------------------------------------------------------

describe('removeItem', () => {
  it('deletes the row without throwing', async () => {
    const client = makeMockClient([]);
    await expect(removeItem(client, USER_ID, SAMPLE_ROW.id)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// bulkAddItems
// ---------------------------------------------------------------------------

describe('bulkAddItems', () => {
  it('returns an array of created items', async () => {
    const client = makeMockClient([SAMPLE_ROW]);
    const result = await bulkAddItems(client, USER_ID, [
      { name: 'chicken breast', display_name: 'Chicken Breast', category: 'protein' },
    ]);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });
});
