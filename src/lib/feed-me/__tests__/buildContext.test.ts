import type { Checkin } from '@/contracts/zod/checkin';
import type { PantryItem } from '@/contracts/zod/pantry';
import type { Profile } from '@/contracts/zod/profile';
import type { BuildContextDeps } from '@/lib/feed-me/buildContext';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

// We test buildContext by injecting deps directly, avoiding Next.js imports.
// This is valid because buildContext accepts an optional _deps parameter.

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const FAKE_SUPABASE = {} as SupabaseClient;

const FAKE_TARGETS = {
  kcal: 2400,
  protein_g: 165,
  carbs_g: 270,
  fat_g: 67,
};

const FAKE_PROFILE: Profile = {
  user_id: USER_ID,
  display_name: 'Test User',
  goal: 'maintain',
  targets: FAKE_TARGETS,
  height_cm: 175,
  weight_kg: 75,
  birthdate: '1990-01-01',
  sex: 'male',
  activity_level: 'moderate',
  dietary_pattern: null,
  allergies: ['peanuts'],
  dislikes: ['cilantro'],
  cuisines: ['mediterranean'],
  equipment: ['oven', 'stovetop'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const FAKE_PANTRY: PantryItem[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    user_id: USER_ID,
    name: 'chicken breast',
    display_name: 'Chicken Breast',
    category: 'protein',
    available: true,
    added_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    user_id: USER_ID,
    name: 'brown rice',
    display_name: 'Brown Rice',
    category: 'grain',
    available: true,
    added_at: new Date().toISOString(),
  },
];

const FAKE_CHECKIN: Checkin = {
  id: '33333333-3333-3333-3333-333333333333',
  user_id: USER_ID,
  date: new Date().toISOString().slice(0, 10),
  energy: 3,
  training: 'light',
  hunger: 'normal',
  note: null,
  created_at: new Date().toISOString(),
};

function makeHappyDeps(overrides: Partial<BuildContextDeps> = {}): BuildContextDeps {
  return {
    getProfile: vi.fn().mockResolvedValue(FAKE_PROFILE),
    getPantry: vi.fn().mockResolvedValue(FAKE_PANTRY),
    getCheckin: vi.fn().mockResolvedValue(FAKE_CHECKIN),
    getCookTitles: vi.fn().mockResolvedValue(['lemon pasta', 'oat bowl']),
    ...overrides,
  };
}

// Lazy import so dynamic imports in buildContext are isolated per test
async function callBuildContext(
  deps: BuildContextDeps,
  opts: { candidateCount?: number; localDate?: string } = {},
) {
  const { buildContext } = await import('@/lib/feed-me/buildContext');
  return buildContext(FAKE_SUPABASE, USER_ID, opts, deps);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('buildContext', () => {
  it('returns ok:true with a complete BuildContextValue on happy path', async () => {
    const deps = makeHappyDeps();
    const result = await callBuildContext(deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { ctx, recentCookTitles } = result.value;

    // Profile forwarded correctly
    expect(ctx.profile.goal).toBe('maintain');
    expect(ctx.profile.allergies).toEqual(['peanuts']);
    expect(ctx.profile.dislikes).toEqual(['cilantro']);
    expect(ctx.profile.equipment).toEqual(['oven', 'stovetop']);
    expect(ctx.profile.targets).toEqual(FAKE_TARGETS);

    // Pantry items forwarded (available only)
    expect(ctx.pantry).toHaveLength(2);
    expect(ctx.pantry[0]?.name).toBe('chicken breast');

    // Check-in forwarded
    expect(ctx.checkin).not.toBeNull();
    expect(ctx.checkin?.energy).toBe(3);

    // Recent cook titles forwarded
    expect(recentCookTitles).toEqual(['lemon pasta', 'oat bowl']);

    // Default candidate count
    expect(ctx.request.candidateCount).toBeGreaterThanOrEqual(1);
  });

  it('returns ok:false with PROFILE_INCOMPLETE when profile is null', async () => {
    const deps = makeHappyDeps({ getProfile: vi.fn().mockResolvedValue(null) });
    const result = await callBuildContext(deps);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PROFILE_INCOMPLETE');
  });

  it('returns ok:false with PROFILE_INCOMPLETE when profile has no targets', async () => {
    const profileNoTargets = {
      ...FAKE_PROFILE,
      targets: undefined as unknown as typeof FAKE_TARGETS,
    };
    const deps = makeHappyDeps({ getProfile: vi.fn().mockResolvedValue(profileNoTargets) });
    const result = await callBuildContext(deps);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PROFILE_INCOMPLETE');
  });

  it('returns ok:true with checkin:undefined when no check-in exists today', async () => {
    const deps = makeHappyDeps({ getCheckin: vi.fn().mockResolvedValue(null) });
    const result = await callBuildContext(deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ctx.checkin).toBeUndefined();
  });

  it('accepts an explicit candidateCount override', async () => {
    const deps = makeHappyDeps();
    const result = await callBuildContext(deps, { candidateCount: 2 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ctx.request.candidateCount).toBe(2);
  });

  it('passes the localDate option through to getCheckin', async () => {
    const getCheckin = vi.fn().mockResolvedValue(FAKE_CHECKIN);
    const deps = makeHappyDeps({ getCheckin });

    await callBuildContext(deps, { localDate: '2026-04-26' });

    expect(getCheckin).toHaveBeenCalledWith('2026-04-26');
  });

  it('filters pantry to only available items', async () => {
    const withUnavailable: PantryItem[] = [
      ...FAKE_PANTRY,
      {
        id: '99999999-9999-9999-9999-999999999999',
        user_id: USER_ID,
        name: 'expired milk',
        display_name: 'Expired Milk',
        category: 'dairy',
        available: false,
        added_at: new Date().toISOString(),
      },
    ];
    const deps = makeHappyDeps({ getPantry: vi.fn().mockResolvedValue(withUnavailable) });
    const result = await callBuildContext(deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ctx.pantry.every((p) => p.available)).toBe(true);
    expect(result.value.ctx.pantry).toHaveLength(2);
  });

  it('returns ok:false with DATA_FETCH_FAILED when a dep throws', async () => {
    const deps = makeHappyDeps({
      getPantry: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    });
    const result = await callBuildContext(deps);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('DATA_FETCH_FAILED');
    expect(result.error.message).toContain('DB connection failed');
  });
});
