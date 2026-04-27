import { describe, expect, it, vi } from 'vitest';
import { ensureAccessToken } from '../auth';
import { EightSleepClient } from '../client';

function clientWithAuth(
  authImpl: () => Promise<{ access_token: string; expires_at: string; userId: string | null }>,
) {
  const client = new EightSleepClient({});
  client.authenticate = vi.fn(authImpl) as unknown as EightSleepClient['authenticate'];
  return client;
}

const baseCreds = { email: 'a@b.com', password: 'p', access_token: null, expires_at: null };

describe('ensureAccessToken', () => {
  it('reuses a cached token that has not yet expired', async () => {
    const client = clientWithAuth(async () => {
      throw new Error('should not call authenticate');
    });
    const creds = {
      ...baseCreds,
      access_token: 'cached',
      expires_at: '2026-04-26T12:00:00.000Z',
    };
    const now = new Date('2026-04-26T11:00:00.000Z');
    const res = await ensureAccessToken(client, creds, now);
    expect(res.token).toBe('cached');
    expect(res.updatedCreds).toBeNull();
  });

  it('re-authenticates when the cached token is expired', async () => {
    const auth = vi.fn(async () => ({
      access_token: 'fresh',
      expires_at: '2026-04-26T13:00:00.000Z',
      userId: 'u-9',
    }));
    const client = new EightSleepClient({});
    client.authenticate = auth as unknown as EightSleepClient['authenticate'];

    const creds = {
      ...baseCreds,
      access_token: 'stale',
      expires_at: '2026-04-26T11:00:00.000Z',
    };
    const now = new Date('2026-04-26T12:00:00.000Z');
    const res = await ensureAccessToken(client, creds, now);

    expect(auth).toHaveBeenCalledWith('a@b.com', 'p');
    expect(res.token).toBe('fresh');
    expect(res.updatedCreds?.access_token).toBe('fresh');
    expect(res.updatedCreds?.expires_at).toBe('2026-04-26T13:00:00.000Z');
    expect(res.userId).toBe('u-9');
  });

  it('re-authenticates when no cached token exists', async () => {
    const auth = vi.fn(async () => ({
      access_token: 't',
      expires_at: '2030-01-01T00:00:00.000Z',
      userId: null,
    }));
    const client = new EightSleepClient({});
    client.authenticate = auth as unknown as EightSleepClient['authenticate'];
    const res = await ensureAccessToken(client, baseCreds, new Date());
    expect(auth).toHaveBeenCalled();
    expect(res.token).toBe('t');
  });

  it('forces re-auth when forceReauth=true even with a fresh cached token', async () => {
    const auth = vi.fn(async () => ({
      access_token: 'forced',
      expires_at: '2030-01-01T00:00:00.000Z',
      userId: null,
    }));
    const client = new EightSleepClient({});
    client.authenticate = auth as unknown as EightSleepClient['authenticate'];
    const creds = {
      ...baseCreds,
      access_token: 'still-good',
      expires_at: '2030-01-01T00:00:00.000Z',
    };
    const res = await ensureAccessToken(client, creds, new Date('2026-04-26T00:00:00Z'), true);
    expect(auth).toHaveBeenCalled();
    expect(res.token).toBe('forced');
  });
});
