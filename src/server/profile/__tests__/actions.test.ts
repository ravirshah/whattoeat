import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock auth helper
vi.mock('@/server/auth', () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: 'user-test-123', email: 'test@example.com' }),
}));

// Mock the repo
vi.mock('@/server/profile/repo', () => ({
  getProfileByUserId: vi.fn(),
  upsertProfile: vi.fn(),
}));

// Mock macros
vi.mock('@/lib/macros', () => ({
  computeTargets: vi.fn(),
}));

describe('getMyProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls requireUser() and threads userId into getProfileByUserId', async () => {
    const { requireUser } = await import('@/server/auth');
    const { getProfileByUserId } = await import('@/server/profile/repo');
    vi.mocked(getProfileByUserId).mockResolvedValue(null);

    const { getMyProfile } = await import('@/server/profile/actions');
    const result = await getMyProfile();

    expect(requireUser).toHaveBeenCalledTimes(1);
    expect(getProfileByUserId).toHaveBeenCalledWith('user-test-123');
    expect(result).toBeNull();
  });
});

describe('updateProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates input via Zod — rejects invalid goal', async () => {
    const { updateProfile } = await import('@/server/profile/actions');
    await expect(updateProfile({ goal: 'invalid-goal' as never })).rejects.toThrow();
  });

  it('threads userId from requireUser into upsertProfile', async () => {
    const { upsertProfile } = await import('@/server/profile/repo');
    const { computeTargets } = await import('@/lib/macros');

    const fakeProfile = {
      user_id: 'user-test-123',
      goal: 'bulk',
      targets: { kcal: 3000, protein_g: 180, carbs_g: 350, fat_g: 80 },
      height_cm: null,
      weight_kg: null,
      birthdate: null,
      sex: null,
      activity_level: null,
      display_name: null,
      allergies: [],
      dislikes: [],
      cuisines: [],
      equipment: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    vi.mocked(upsertProfile).mockResolvedValue(fakeProfile as never);
    vi.mocked(computeTargets).mockReturnValue(null); // no biometrics → skip recompute

    const { updateProfile } = await import('@/server/profile/actions');
    await updateProfile({ goal: 'bulk' });

    expect(upsertProfile).toHaveBeenCalledWith(
      'user-test-123',
      expect.objectContaining({ goal: 'bulk' }),
    );
  });

  it('auto-recomputes macros when biometric fields change and no explicit targets in patch', async () => {
    const { upsertProfile } = await import('@/server/profile/repo');
    const { computeTargets } = await import('@/lib/macros');
    const { getProfileByUserId } = await import('@/server/profile/repo');

    const baseProfile = {
      user_id: 'user-test-123',
      goal: 'maintain',
      targets: { kcal: 2000, protein_g: 150, carbs_g: 220, fat_g: 55 },
      height_cm: 175,
      weight_kg: 80,
      birthdate: '1990-01-01',
      sex: 'male',
      activity_level: 'moderate',
      display_name: null,
      allergies: [],
      dislikes: [],
      cuisines: [],
      equipment: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    vi.mocked(getProfileByUserId).mockResolvedValue(baseProfile as never);
    vi.mocked(computeTargets).mockReturnValue({
      kcal: 2664,
      protein_g: 176,
      carbs_g: 288,
      fat_g: 74,
    });
    vi.mocked(upsertProfile).mockResolvedValue({ ...baseProfile, weight_kg: 85 } as never);

    const { updateProfile } = await import('@/server/profile/actions');
    await updateProfile({ weight_kg: 85 });

    expect(computeTargets).toHaveBeenCalledTimes(1);
    // Should persist new targets
    expect(upsertProfile).toHaveBeenCalledWith(
      'user-test-123',
      expect.objectContaining({
        targets: { kcal: 2664, protein_g: 176, carbs_g: 288, fat_g: 74 },
      }),
    );
  });
});

describe('recomputeMacros', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches current profile, computes targets, and persists them', async () => {
    const { getProfileByUserId, upsertProfile } = await import('@/server/profile/repo');
    const { computeTargets } = await import('@/lib/macros');

    const profile = {
      user_id: 'user-test-123',
      goal: 'cut',
      targets: { kcal: 1800, protein_g: 160, carbs_g: 150, fat_g: 50 },
      height_cm: 175,
      weight_kg: 80,
      birthdate: '1990-01-01',
      sex: 'male',
      activity_level: 'active',
      display_name: null,
      allergies: [],
      dislikes: [],
      cuisines: [],
      equipment: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    vi.mocked(getProfileByUserId).mockResolvedValue(profile as never);
    vi.mocked(computeTargets).mockReturnValue({
      kcal: 2100,
      protein_g: 176,
      carbs_g: 200,
      fat_g: 58,
    });
    vi.mocked(upsertProfile).mockResolvedValue({ ...profile } as never);

    const { recomputeMacros } = await import('@/server/profile/actions');
    await recomputeMacros();

    expect(computeTargets).toHaveBeenCalledWith(profile);
    expect(upsertProfile).toHaveBeenCalledWith(
      'user-test-123',
      expect.objectContaining({
        targets: { kcal: 2100, protein_g: 176, carbs_g: 200, fat_g: 58 },
      }),
    );
  });
});
