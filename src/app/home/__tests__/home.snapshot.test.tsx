// src/app/home/__tests__/home.snapshot.test.tsx
// Tests for the authenticated home page.
// Uses renderToReadableStream for async Server Components.
import { describe, expect, it, vi } from 'vitest';

// ── Module mocks ─────────────────────────────────────────────────────────────
vi.mock('@/server/auth', () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: 'user-123', email: 'test@example.com' }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}));

const mockProfile = {
  user_id: 'user-123',
  goal: 'maintain' as const,
  height_cm: 175,
  weight_kg: 75,
  birthdate: '1990-01-01',
  sex: 'male' as const,
  activity_level: 'moderate' as const,
  dietary_pattern: null,
  targets: { kcal: 2200, protein_g: 165, carbs_g: 275, fat_g: 73 },
  allergies: [],
  dislikes: [],
  cuisines: [],
  equipment: [],
  display_name: 'Test User',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

vi.mock('@/server/profile', () => ({
  getMyProfile: vi.fn().mockResolvedValue(mockProfile),
}));

vi.mock('@/server/pantry/repo', () => ({
  listForUser: vi.fn().mockResolvedValue([
    {
      id: '1',
      name: 'chicken_breast',
      display_name: 'Chicken breast',
      category: 'protein',
      available: true,
      user_id: 'user-123',
      added_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'olive_oil',
      display_name: 'Olive oil',
      category: 'fat',
      available: true,
      user_id: 'user-123',
      added_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'garlic',
      display_name: 'Garlic',
      category: 'produce',
      available: true,
      user_id: 'user-123',
      added_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'pasta',
      display_name: 'Pasta',
      category: 'grain',
      available: true,
      user_id: 'user-123',
      added_at: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'canned_tomatoes',
      display_name: 'Canned tomatoes',
      category: 'pantry_staple',
      available: true,
      user_id: 'user-123',
      added_at: new Date().toISOString(),
    },
    {
      id: '6',
      name: 'onion',
      display_name: 'Onion',
      category: 'produce',
      available: true,
      user_id: 'user-123',
      added_at: new Date().toISOString(),
    },
  ]),
}));

vi.mock('@/server/checkin', () => ({
  getTodayCheckin: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/server/recipes', () => ({
  listCookedLog: vi.fn().mockResolvedValue([]),
}));

/** Render an async RSC to a string by awaiting its promise. */
async function renderAsyncRSC(component: React.ReactElement): Promise<string> {
  const _React = await import('react');
  const { renderToPipeableStream } = await import('react-dom/server');

  return new Promise<string>((resolve, reject) => {
    let html = '';
    const { pipe } = renderToPipeableStream(component, {
      onShellReady() {
        const { Writable } = require('node:stream');
        const writable = new Writable({
          write(chunk: Buffer, _enc: string, cb: () => void) {
            html += chunk.toString();
            cb();
          },
          final(cb: () => void) {
            resolve(html);
            cb();
          },
        });
        pipe(writable);
      },
      onError(err: unknown) {
        reject(err);
      },
    });
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('HomePage', () => {
  it('renders the home dashboard without crashing (no checkin, no last cooked)', async () => {
    const React = await import('react');
    const { default: HomePage } = await import('@/app/home/page');

    const html = await renderAsyncRSC(React.createElement(HomePage));

    // Structural checks
    expect(html).toContain('Feed Me');
    expect(html).toContain('Pantry');
    expect(html).toContain('Today');
  });

  it('shows low-stock warning when pantry has fewer than 5 items', async () => {
    const { listForUser } = await import('@/server/pantry/repo');
    (listForUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: '1',
        name: 'eggs',
        display_name: 'Eggs',
        category: 'protein',
        available: true,
        user_id: 'user-123',
        added_at: new Date().toISOString(),
      },
    ]);

    const React = await import('react');
    const { default: HomePage } = await import('@/app/home/page');

    const html = await renderAsyncRSC(React.createElement(HomePage));

    expect(html).toContain('Running low');
  });
});
