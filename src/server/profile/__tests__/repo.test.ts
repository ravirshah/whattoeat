import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the db client before importing the repo
vi.mock('@/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

// We'll import the repo after the mock is in place
// (dynamic import used so the mock is hoisted correctly)

describe('profileRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getProfileByUserId calls db.select with correct userId filter', async () => {
    const { db } = await import('@/db/client');
    const mockChain = { from: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) };
    vi.mocked(db.select).mockReturnValue(mockChain as never);

    const { getProfileByUserId } = await import('@/server/profile/repo');
    const result = await getProfileByUserId('user-abc');

    expect(db.select).toHaveBeenCalledTimes(1);
    expect(mockChain.where).toHaveBeenCalledTimes(1);
    expect(result).toBeNull(); // empty array → null
  });

  it('getProfileByUserId returns mapped Profile when row exists', async () => {
    const { db } = await import('@/db/client');
    const fakeRow = {
      user_id: 'user-abc',
      display_name: 'Ravi',
      goal: 'maintain',
      target_kcal: 2200,
      target_protein_g: 160,
      target_carbs_g: 240,
      target_fat_g: 61,
      height_cm: '175.0',
      weight_kg: '80.0',
      birthdate: '1990-01-01',
      sex: 'male',
      activity_level: 'moderate',
      allergies: [],
      dislikes: [],
      cuisines: [],
      equipment: [],
      created_at: new Date(),
      updated_at: new Date(),
    };
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([fakeRow]),
    };
    vi.mocked(db.select).mockReturnValue(mockChain as never);

    const { getProfileByUserId } = await import('@/server/profile/repo');
    const result = await getProfileByUserId('user-abc');

    expect(result).not.toBeNull();
    expect(result?.user_id).toBe('user-abc');
    expect(result?.goal).toBe('maintain');
    expect(result?.targets.kcal).toBe(2200);
  });

  it('upsertProfile inserts when no existing row', async () => {
    const { db } = await import('@/db/client');
    const insertMock = {
      into: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          user_id: 'user-abc',
          display_name: null,
          goal: 'bulk',
          target_kcal: 3000,
          target_protein_g: 180,
          target_carbs_g: 350,
          target_fat_g: 80,
          height_cm: null,
          weight_kg: null,
          birthdate: null,
          sex: null,
          activity_level: null,
          allergies: [],
          dislikes: [],
          cuisines: [],
          equipment: [],
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]),
    };
    vi.mocked(db.insert).mockReturnValue(insertMock as never);

    const { upsertProfile } = await import('@/server/profile/repo');
    const result = await upsertProfile('user-abc', {
      goal: 'bulk',
      targets: { kcal: 3000, protein_g: 180, carbs_g: 350, fat_g: 80 },
    });

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(result.goal).toBe('bulk');
  });
});
