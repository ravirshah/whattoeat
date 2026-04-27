import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/server/auth', () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: 'user-test-abc', email: 'test@example.com' }),
}));

const mockSelectResult: unknown[] = [];
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockImplementation(() => Promise.resolve(mockSelectResult)),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

vi.mock('@/db/client', () => ({ db: mockDb }));

vi.mock('@/db/schema/health-extractions', () => ({
  healthExtractions: { id: 'id', user_id: 'user_id', status: 'status' },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

const FAKE_PROFILE = {
  user_id: 'user-test-abc',
  goal: 'cut' as const,
  targets: { kcal: 1900, protein_g: 170, carbs_g: 170, fat_g: 53 },
  height_cm: 175,
  weight_kg: 80,
  birthdate: '1990-01-01',
  sex: 'male' as const,
  activity_level: 'active' as const,
  dietary_pattern: null,
  display_name: null,
  allergies: [],
  dislikes: [],
  cuisines: [],
  equipment: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

vi.mock('@/server/profile/repo', () => ({
  upsertProfile: vi.fn().mockResolvedValue(FAKE_PROFILE),
}));

// ---------------------------------------------------------------------------
// Helpers — inject a row into the mock select result
// ---------------------------------------------------------------------------

function seedExtractionRow(row: Record<string, unknown>) {
  mockSelectResult.length = 0;
  mockSelectResult.push(row);
}

function clearExtractionRows() {
  mockSelectResult.length = 0;
}

// ---------------------------------------------------------------------------
// Tests — applyHealthExtraction
// ---------------------------------------------------------------------------

describe('applyHealthExtraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockImplementation(() => Promise.resolve(mockSelectResult));
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.set.mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));
  });

  it('returns not_found when no matching extraction exists', async () => {
    clearExtractionRows();
    const { applyHealthExtraction } = await import('@/server/profile/apply-health-extraction');
    const result = await applyHealthExtraction('nonexistent-id');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_found');
    }
  });

  it('returns validation_failed when extraction is already applied', async () => {
    seedExtractionRow({
      id: 'extraction-1',
      user_id: 'user-test-abc',
      doc_type: 'bloodwork',
      markers: [],
      suggested: {},
      summary: 'test',
      status: 'applied',
    });

    const { applyHealthExtraction } = await import('@/server/profile/apply-health-extraction');
    const result = await applyHealthExtraction('extraction-1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
    }
  });

  it('applies suggested activity_level to profile and marks status applied', async () => {
    seedExtractionRow({
      id: 'extraction-2',
      user_id: 'user-test-abc',
      doc_type: 'fitness_tracker',
      markers: [],
      suggested: { activity_level: 'active' },
      summary: 'Fitness tracker showing active lifestyle.',
      status: 'pending',
    });

    const { upsertProfile } = await import('@/server/profile/repo');
    const { applyHealthExtraction } = await import('@/server/profile/apply-health-extraction');
    const result = await applyHealthExtraction('extraction-2');

    expect(result.ok).toBe(true);
    expect(upsertProfile).toHaveBeenCalledWith(
      'user-test-abc',
      expect.objectContaining({ activity_level: 'active' }),
    );
  });

  it('applies suggested goal and targets to profile', async () => {
    seedExtractionRow({
      id: 'extraction-3',
      user_id: 'user-test-abc',
      doc_type: 'body_composition',
      markers: [],
      suggested: {
        goal: 'cut',
        targets: { kcal: 1900, protein_g: 170, carbs_g: 170, fat_g: 53 },
      },
      summary: 'Body composition scan.',
      status: 'pending',
    });

    const { upsertProfile } = await import('@/server/profile/repo');
    const { applyHealthExtraction } = await import('@/server/profile/apply-health-extraction');
    await applyHealthExtraction('extraction-3');

    expect(upsertProfile).toHaveBeenCalledWith(
      'user-test-abc',
      expect.objectContaining({
        goal: 'cut',
        targets: expect.objectContaining({ kcal: 1900 }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Tests — discardHealthExtraction
// ---------------------------------------------------------------------------

describe('discardHealthExtraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockImplementation(() => Promise.resolve(mockSelectResult));
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.set.mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));
  });

  it('returns not_found when extraction does not exist', async () => {
    clearExtractionRows();
    const { discardHealthExtraction } = await import('@/server/profile/apply-health-extraction');
    const result = await discardHealthExtraction('no-such-id');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_found');
    }
  });

  it('marks extraction as discarded and returns ok', async () => {
    seedExtractionRow({
      id: 'extraction-4',
      user_id: 'user-test-abc',
      doc_type: 'unknown',
      markers: [],
      suggested: {},
      summary: 'Unrecognised document.',
      status: 'pending',
    });

    const { discardHealthExtraction } = await import('@/server/profile/apply-health-extraction');
    const result = await discardHealthExtraction('extraction-4');
    expect(result.ok).toBe(true);
  });
});
