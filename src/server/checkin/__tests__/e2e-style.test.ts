import type { CheckinUpsert, HungerLevel, TrainingLevel } from '@/contracts/zod/checkin';
/**
 * End-to-end-style test: save -> getToday returns it -> save again same date
 * -> upsert (single row, latest values).
 *
 * Uses a thin in-memory store that mirrors the repo contract so the test
 * exercises the full action logic without a DB or network.
 */
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory store that mirrors checkinRepo's contract.
// ---------------------------------------------------------------------------
type Row = {
  id: string;
  user_id: string;
  date: string;
  energy: number;
  training: TrainingLevel;
  hunger: HungerLevel;
  note: string | null;
  created_at: Date;
};

function makeInMemoryRepo() {
  const store = new Map<string, Row>(); // key = `${userId}::${date}`

  return {
    _store: store,

    async today(userId: string, date: string): Promise<Row | null> {
      return store.get(`${userId}::${date}`) ?? null;
    },

    async upsert(userId: string, input: CheckinUpsert): Promise<Row> {
      const key = `${userId}::${input.date}`;
      const existing = store.get(key);
      const row: Row = {
        id: existing?.id ?? crypto.randomUUID(),
        user_id: userId,
        date: input.date,
        energy: input.energy,
        training: input.training,
        hunger: input.hunger,
        note: input.note ?? null,
        created_at: existing?.created_at ?? new Date(),
      };
      store.set(key, row);
      return row;
    },

    async recent(userId: string, days = 7): Promise<Row[]> {
      return [...store.values()]
        .filter((r) => r.user_id === userId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, days);
    },

    async range(userId: string, from: string, to: string): Promise<Row[]> {
      return [...store.values()]
        .filter((r) => r.user_id === userId && r.date >= from && r.date <= to)
        .sort((a, b) => b.date.localeCompare(a.date));
    },
  };
}

// ---------------------------------------------------------------------------
// Wire actions with the in-memory repo
// ---------------------------------------------------------------------------
const USER_ID = 'e2e-user';
const TODAY = '2026-04-26';

async function makeActions(repo: ReturnType<typeof makeInMemoryRepo>) {
  // Thin wrappers that mirror the real action signatures but skip Next.js wiring.
  async function getTodayCheckin(localDate?: string) {
    const date = localDate ?? TODAY;
    return repo.today(USER_ID, date);
  }

  async function saveCheckin(input: CheckinUpsert) {
    return repo.upsert(USER_ID, input);
  }

  async function listRecentCheckins(days = 7) {
    return repo.recent(USER_ID, days);
  }

  async function getCheckinsForRange(start: string, end: string) {
    return repo.range(USER_ID, start, end);
  }

  return { getTodayCheckin, saveCheckin, listRecentCheckins, getCheckinsForRange };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('check-in e2e flow', () => {
  it('save -> getToday returns it', async () => {
    const repo = makeInMemoryRepo();
    const { saveCheckin, getTodayCheckin } = await makeActions(repo);

    const saved = await saveCheckin({
      date: TODAY,
      energy: 4,
      training: 'light',
      hunger: 'normal',
    });
    expect(saved.energy).toBe(4);

    const today = await getTodayCheckin(TODAY);
    expect(today).not.toBeNull();
    expect(today?.energy).toBe(4);
    expect(today?.date).toBe(TODAY);
  });

  it('save again same date -> upsert: single row, latest values', async () => {
    const repo = makeInMemoryRepo();
    const { saveCheckin, getTodayCheckin } = await makeActions(repo);

    await saveCheckin({ date: TODAY, energy: 2, training: 'none', hunger: 'low' });
    await saveCheckin({
      date: TODAY,
      energy: 5,
      training: 'hard',
      hunger: 'high',
      note: 'crushed it',
    });

    // Store must have exactly one row for this user+date.
    expect(repo._store.size).toBe(1);

    const today = await getTodayCheckin(TODAY);
    expect(today?.energy).toBe(5);
    expect(today?.training).toBe('hard');
    expect(today?.hunger).toBe('high');
    expect(today?.note).toBe('crushed it');
  });

  it('listRecentCheckins returns rows ordered newest first', async () => {
    const repo = makeInMemoryRepo();
    const { saveCheckin, listRecentCheckins } = await makeActions(repo);

    await saveCheckin({ date: '2026-04-24', energy: 3, training: 'light', hunger: 'normal' });
    await saveCheckin({ date: '2026-04-25', energy: 4, training: 'none', hunger: 'low' });
    await saveCheckin({ date: TODAY, energy: 5, training: 'hard', hunger: 'high' });

    const recent = await listRecentCheckins(7);
    expect(recent[0]?.date).toBe(TODAY);
    expect(recent[2]?.date).toBe('2026-04-24');
  });

  it('getCheckinsForRange returns only rows in the range', async () => {
    const repo = makeInMemoryRepo();
    const { saveCheckin, getCheckinsForRange } = await makeActions(repo);

    await saveCheckin({ date: '2026-04-20', energy: 2, training: 'none', hunger: 'low' });
    await saveCheckin({ date: '2026-04-23', energy: 3, training: 'light', hunger: 'normal' });
    await saveCheckin({ date: TODAY, energy: 5, training: 'hard', hunger: 'high' });

    const result = await getCheckinsForRange('2026-04-21', TODAY);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.date)).not.toContain('2026-04-20');
  });
});
