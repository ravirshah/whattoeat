import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock auth helper — must come before importing actions.
// ---------------------------------------------------------------------------
vi.mock('@/server/auth', () => ({
  requireUser: vi.fn(),
}));

// Mock the repo so we don't touch the DB.
vi.mock('@/server/checkin/repo', () => ({
  checkinRepo: {
    today: vi.fn(),
    upsert: vi.fn(),
    recent: vi.fn(),
    range: vi.fn(),
  },
}));

// next/headers is not available in vitest — mock it.
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}));

import { requireUser } from '@/server/auth';
import {
  getCheckinsForRange,
  getTodayCheckin,
  listRecentCheckins,
  saveCheckin,
} from '@/server/checkin/actions';
import { checkinRepo } from '@/server/checkin/repo';

const mockRequireUser = vi.mocked(requireUser);
const mockRepo = vi.mocked(checkinRepo);

const FAKE_USER = { userId: 'user-xyz', email: 'ravi@example.com' };
const TODAY = '2026-04-26';
const BASE_ROW = {
  id: 'row-1',
  user_id: 'user-xyz',
  date: TODAY,
  energy: 3,
  training: 'light' as const,
  hunger: 'normal' as const,
  note: null,
  created_at: '2026-04-26T10:00:00.000Z',
};

describe('getTodayCheckin', () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns today's check-in when one exists", async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    mockRepo.today.mockResolvedValue(BASE_ROW);
    const result = await getTodayCheckin();
    expect(result).toEqual(BASE_ROW);
    expect(mockRepo.today).toHaveBeenCalledWith('user-xyz', expect.any(String));
  });

  it('returns null when no check-in exists', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    mockRepo.today.mockResolvedValue(null);
    const result = await getTodayCheckin();
    expect(result).toBeNull();
  });

  it('always uses userId from requireUser, not a caller argument', async () => {
    mockRequireUser.mockResolvedValue({ userId: 'server-user', email: 'x@x.com' });
    mockRepo.today.mockResolvedValue(null);
    await getTodayCheckin();
    expect(mockRepo.today).toHaveBeenCalledWith('server-user', expect.any(String));
  });
});

describe('saveCheckin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls repo.upsert with the userId from requireUser', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    mockRepo.upsert.mockResolvedValue(BASE_ROW);
    const input = { date: TODAY, energy: 4, training: 'hard' as const, hunger: 'high' as const };
    await saveCheckin(input);
    expect(mockRepo.upsert).toHaveBeenCalledWith('user-xyz', input);
  });

  it('returns the upserted row', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    const updated = { ...BASE_ROW, energy: 5 };
    mockRepo.upsert.mockResolvedValue(updated);
    const result = await saveCheckin({
      date: TODAY,
      energy: 5,
      training: 'light',
      hunger: 'normal',
    });
    expect(result.energy).toBe(5);
  });

  it('throws a validation error if energy is out of range', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    await expect(
      // @ts-expect-error — deliberately invalid
      saveCheckin({ date: TODAY, energy: 99, training: 'light', hunger: 'normal' }),
    ).rejects.toThrow();
    expect(mockRepo.upsert).not.toHaveBeenCalled();
  });
});

describe('listRecentCheckins', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes userId from requireUser to repo.recent', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    mockRepo.recent.mockResolvedValue([BASE_ROW]);
    await listRecentCheckins(7);
    expect(mockRepo.recent).toHaveBeenCalledWith('user-xyz', 7);
  });

  it('defaults to 7 days', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    mockRepo.recent.mockResolvedValue([BASE_ROW]);
    await listRecentCheckins();
    expect(mockRepo.recent).toHaveBeenCalledWith('user-xyz', 7);
  });
});

describe('getCheckinsForRange', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to repo.range with userId from requireUser', async () => {
    mockRequireUser.mockResolvedValue(FAKE_USER);
    mockRepo.range.mockResolvedValue([BASE_ROW]);
    const result = await getCheckinsForRange('2026-04-20', '2026-04-26');
    expect(mockRepo.range).toHaveBeenCalledWith('user-xyz', '2026-04-20', '2026-04-26');
    expect(result).toHaveLength(1);
  });
});
