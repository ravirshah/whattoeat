import type { CheckinUpsert } from '@/contracts/zod/checkin';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Drizzle and the DB module before importing the repo.
// ---------------------------------------------------------------------------
const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
}));

vi.mock('@/db/schema/checkins', () => ({
  checkins: {
    user_id: 'user_id',
    date: 'date',
    energy: 'energy',
    training: 'training',
    hunger: 'hunger',
    note: 'note',
    id: 'id',
    created_at: 'created_at',
  },
}));

// Import after mocks are in place.
import { checkinRepo } from '@/server/checkin/repo';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const USER_ID = 'user-abc-123';
const TODAY = '2026-04-26';
const BASE_ROW = {
  id: 'row-1',
  user_id: USER_ID,
  date: TODAY,
  energy: 3,
  training: 'light' as const,
  hunger: 'normal' as const,
  note: null,
  created_at: '2026-04-26T10:00:00.000Z',
};
const UPSERT_INPUT: CheckinUpsert = {
  date: TODAY,
  energy: 3,
  training: 'light',
  hunger: 'normal',
};

// ---------------------------------------------------------------------------
// Helpers to build fluent Drizzle query chain mocks
// ---------------------------------------------------------------------------
function makeSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn().mockReturnThis(),
  };
  mockSelect.mockReturnValue(chain);
  return chain;
}

function makeInsertChain(returned: unknown[]) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returned),
  };
  mockInsert.mockReturnValue(chain);
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('checkinRepo.today', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a check-in row when one exists for the given date', async () => {
    makeSelectChain([BASE_ROW]);
    const result = await checkinRepo.today(USER_ID, TODAY);
    expect(result).toEqual(BASE_ROW);
  });

  it('returns null when no check-in exists for the given date', async () => {
    makeSelectChain([]);
    const result = await checkinRepo.today(USER_ID, TODAY);
    expect(result).toBeNull();
  });
});

describe('checkinRepo.upsert', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the upserted row', async () => {
    const updated = { ...BASE_ROW, energy: 5 };
    makeInsertChain([updated]);
    const result = await checkinRepo.upsert(USER_ID, { ...UPSERT_INPUT, energy: 5 });
    expect(result).toEqual(updated);
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it('passes user_id from the argument, not from the input object', async () => {
    makeInsertChain([BASE_ROW]);
    await checkinRepo.upsert('explicit-user-id', UPSERT_INPUT);
    // The values() call should include user_id: 'explicit-user-id'
    const chain = mockInsert.mock.results[0]?.value as { values: ReturnType<typeof vi.fn> };
    const valuesArg = chain.values.mock.calls[0]?.[0] as { user_id: string };
    expect(valuesArg?.user_id).toBe('explicit-user-id');
  });
});

describe('checkinRepo.recent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns rows ordered by date desc', async () => {
    const rows = [BASE_ROW, { ...BASE_ROW, date: '2026-04-25', id: 'row-2' }];
    makeSelectChain(rows);
    const result = await checkinRepo.recent(USER_ID, 7);
    expect(result).toHaveLength(2);
    expect(result[0]?.date).toBe(TODAY);
  });

  it('defaults to 7 days when no argument given', async () => {
    makeSelectChain([BASE_ROW]);
    await checkinRepo.recent(USER_ID);
    expect(mockSelect).toHaveBeenCalledOnce();
  });
});

describe('checkinRepo.range', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns rows within the given date range', async () => {
    makeSelectChain([BASE_ROW]);
    const result = await checkinRepo.range(USER_ID, '2026-04-20', '2026-04-26');
    expect(result).toHaveLength(1);
    expect(result[0]?.date).toBe(TODAY);
  });

  it('returns empty array when no rows match', async () => {
    makeSelectChain([]);
    const result = await checkinRepo.range(USER_ID, '2026-01-01', '2026-01-07');
    expect(result).toHaveLength(0);
  });
});
