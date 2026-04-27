import type { EightSleepCredentials } from '@/contracts/zod/integrations';
import type { IntegrationRow } from '@/db/schema/integrations';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EightSleepClient, EightSleepError } from '../client';
import { type EightSleepProviderDeps, EightSleepSignalProvider } from '../provider';

const USER_ID = 'app-user-1';

const baseCreds: EightSleepCredentials = {
  email: 'r@example.com',
  password: 'pw',
  access_token: 'cached-token',
  expires_at: '2030-01-01T00:00:00.000Z',
};

function buildRow(overrides: Partial<IntegrationRow> = {}): IntegrationRow {
  return {
    user_id: USER_ID,
    provider: 'eight_sleep',
    status: 'connected',
    credentials: Buffer.from('opaque'),
    metadata: { providerUserId: 'es-user-9', email: 'r@example.com' },
    connected_at: new Date('2026-04-20T00:00:00Z'),
    last_synced_at: null,
    last_error: null,
    ...overrides,
  };
}

function buildClient(getTrends: ReturnType<typeof vi.fn>): EightSleepClient {
  const client = new EightSleepClient({});
  client.getTrends = getTrends as unknown as EightSleepClient['getTrends'];
  client.authenticate = vi.fn(async () => ({
    access_token: 'fresh-token',
    expires_at: '2030-02-01T00:00:00.000Z',
    userId: 'es-user-9',
  })) as unknown as EightSleepClient['authenticate'];
  return client;
}

interface BuiltDeps {
  deps: EightSleepProviderDeps;
  saveCredentials: ReturnType<typeof vi.fn>;
  insertSnapshot: ReturnType<typeof vi.fn>;
  markSuccess: ReturnType<typeof vi.fn>;
  markError: ReturnType<typeof vi.fn>;
}

function buildDeps(opts: {
  client: EightSleepClient;
  row: IntegrationRow | null;
  creds?: EightSleepCredentials;
}): BuiltDeps {
  const saveCredentials = vi.fn(async () => {});
  const insertSnapshot = vi.fn(async () => {});
  const markSuccess = vi.fn(async () => {});
  const markError = vi.fn(async () => {});
  const deps: EightSleepProviderDeps = {
    client: opts.client,
    loadRow: vi.fn(async () => opts.row),
    saveCredentials,
    insertSnapshot,
    markSuccess,
    markError,
    open: () => opts.creds ?? baseCreds,
    seal: (c) => Buffer.from(JSON.stringify(c)),
    now: () => new Date('2026-04-26T12:00:00Z'),
    timezone: 'America/New_York',
  };
  return { deps, saveCredentials, insertSnapshot, markSuccess, markError };
}

describe('EightSleepSignalProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty signals when no integration row exists', async () => {
    const client = buildClient(vi.fn());
    const { deps, markSuccess } = buildDeps({ client, row: null });
    const provider = new EightSleepSignalProvider(deps);
    const out = await provider.getSignals(USER_ID, { from: '2026-04-25', to: '2026-04-26' });
    expect(out).toEqual({});
    expect(markSuccess).not.toHaveBeenCalled();
  });

  it('returns empty when integration is disconnected', async () => {
    const client = buildClient(vi.fn());
    const { deps } = buildDeps({ client, row: buildRow({ status: 'disconnected' }) });
    const provider = new EightSleepSignalProvider(deps);
    expect(await provider.getSignals(USER_ID, { from: 'a', to: 'b' })).toEqual({});
  });

  it('uses cached token, fetches trends, persists snapshot, returns mapped signals', async () => {
    const getTrends = vi.fn(async () => [
      {
        day: '2026-04-25',
        score: 84,
        sleepDurationSeconds: 27000, // 7.5h
        heartRate: 58,
      },
    ]);
    const client = buildClient(getTrends);
    const { deps, insertSnapshot, markSuccess, saveCredentials } = buildDeps({
      client,
      row: buildRow(),
    });
    const provider = new EightSleepSignalProvider(deps);

    const out = await provider.getSignals(USER_ID, {
      from: '2026-04-25',
      to: '2026-04-26',
    });

    expect(out.sleep).toEqual({ lastNightHours: 7.5, quality: 'great' });
    expect(out.recovery).toEqual({ restingHr: 58 });
    expect(getTrends).toHaveBeenCalledWith('cached-token', 'es-user-9', {
      from: '2026-04-25',
      to: '2026-04-26',
      timezone: 'America/New_York',
    });
    expect(insertSnapshot).toHaveBeenCalledTimes(1);
    expect(insertSnapshot.mock.calls[0]?.[0]).toMatchObject({
      userId: USER_ID,
      observedAt: new Date('2026-04-25T00:00:00.000Z'),
    });
    expect(markSuccess).toHaveBeenCalledWith(USER_ID);
    expect(saveCredentials).not.toHaveBeenCalled(); // cached token still fresh
  });

  it('re-authenticates and persists fresh creds when cached token is expired', async () => {
    const getTrends = vi.fn(async () => [
      { day: '2026-04-25', score: 70, sleepDurationSeconds: 25200, heartRate: 60 },
    ]);
    const client = buildClient(getTrends);
    const expiredCreds: EightSleepCredentials = {
      ...baseCreds,
      access_token: 'stale',
      expires_at: '2026-04-26T11:00:00.000Z', // 1h before deps.now
    };
    const { deps, saveCredentials } = buildDeps({
      client,
      row: buildRow(),
      creds: expiredCreds,
    });
    const provider = new EightSleepSignalProvider(deps);

    await provider.getSignals(USER_ID, { from: '2026-04-25', to: '2026-04-26' });
    expect(saveCredentials).toHaveBeenCalledTimes(1);
    expect(getTrends).toHaveBeenCalledWith('fresh-token', 'es-user-9', expect.any(Object));
  });

  it('on 401 from trends, forces re-auth and retries once', async () => {
    const getTrends = vi
      .fn()
      .mockRejectedValueOnce(new EightSleepError('unauthorized', 'expired', 401))
      .mockResolvedValueOnce([
        { day: '2026-04-25', score: 70, sleepDurationSeconds: 25200, heartRate: 60 },
      ]);
    const client = buildClient(getTrends);
    const { deps, saveCredentials, markSuccess } = buildDeps({ client, row: buildRow() });
    const provider = new EightSleepSignalProvider(deps);
    const out = await provider.getSignals(USER_ID, { from: '2026-04-25', to: '2026-04-26' });
    expect(out.sleep?.lastNightHours).toBe(7);
    expect(getTrends).toHaveBeenCalledTimes(2);
    expect(saveCredentials).toHaveBeenCalledTimes(1);
    expect(markSuccess).toHaveBeenCalledWith(USER_ID);
  });

  it('marks an error and rethrows on rate_limited', async () => {
    const getTrends = vi.fn(async () => {
      throw new EightSleepError('rate_limited', 'limited', 429);
    });
    const client = buildClient(getTrends);
    const { deps, markError, markSuccess } = buildDeps({ client, row: buildRow() });
    const provider = new EightSleepSignalProvider(deps);

    await expect(
      provider.getSignals(USER_ID, { from: '2026-04-25', to: '2026-04-26' }),
    ).rejects.toBeInstanceOf(EightSleepError);
    expect(markError).toHaveBeenCalledWith(USER_ID, expect.stringContaining('limited'));
    expect(markSuccess).not.toHaveBeenCalled();
  });

  it('marks an error and returns empty when trends has no days at all', async () => {
    const getTrends = vi.fn(async () => []);
    const client = buildClient(getTrends);
    const { deps, markSuccess, markError, insertSnapshot } = buildDeps({
      client,
      row: buildRow(),
    });
    const provider = new EightSleepSignalProvider(deps);
    const out = await provider.getSignals(USER_ID, { from: '2026-04-19', to: '2026-04-26' });
    expect(out).toEqual({});
    expect(markSuccess).not.toHaveBeenCalled();
    expect(markError).toHaveBeenCalledWith(USER_ID, expect.stringContaining('no sleep days'));
    expect(insertSnapshot).not.toHaveBeenCalled();
  });

  it('marks an error AND stores a diagnostic snapshot when days have no duration', async () => {
    const getTrends = vi.fn(async () => [{ day: '2026-04-25' }]); // no duration
    const client = buildClient(getTrends);
    const { deps, markSuccess, markError, insertSnapshot } = buildDeps({
      client,
      row: buildRow(),
    });
    const provider = new EightSleepSignalProvider(deps);
    const out = await provider.getSignals(USER_ID, { from: '2026-04-25', to: '2026-04-26' });
    expect(out).toEqual({});
    expect(markSuccess).not.toHaveBeenCalled();
    expect(markError).toHaveBeenCalledWith(USER_ID, expect.stringContaining('1 day(s)'));
    // Diagnostic snapshot is persisted so the debug panel can reveal the raw
    // shape Eight Sleep returned (helps diagnose schema drift).
    expect(insertSnapshot).toHaveBeenCalledTimes(1);
    expect(insertSnapshot.mock.calls[0]?.[0].payload).toMatchObject({
      _diagnostic: 'no_usable_day',
      daysReturned: 1,
    });
  });

  it('still inserts a snapshot for a day with duration but no score yet', async () => {
    const getTrends = vi.fn(async () => [
      { day: '2026-04-25', sleepDurationSeconds: 25200, heartRate: 60 },
    ]);
    const client = buildClient(getTrends);
    const { deps, insertSnapshot, markSuccess } = buildDeps({ client, row: buildRow() });
    const provider = new EightSleepSignalProvider(deps);
    const out = await provider.getSignals(USER_ID, { from: '2026-04-25', to: '2026-04-26' });
    expect(out.sleep).toEqual({ lastNightHours: 7 });
    expect(insertSnapshot).toHaveBeenCalledTimes(1);
    expect(markSuccess).toHaveBeenCalledWith(USER_ID);
  });
});
