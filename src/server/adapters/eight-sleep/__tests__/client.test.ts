import { describe, expect, it, vi } from 'vitest';
import { EightSleepClient, EightSleepError } from '../client';

function fakeFetch(handler: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(typeof input === 'string' ? input : input.toString(), init),
  ) as unknown as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('EightSleepClient.authenticate', () => {
  it('posts form-urlencoded grant and returns expires_at with 60s safety margin', async () => {
    const fetched: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = fakeFetch(async (url, init) => {
      fetched.push({ url, init: init as RequestInit });
      return jsonResponse({ access_token: 'tok', expires_in: 3600, userId: 'user-1' });
    });
    const fixedNow = new Date('2026-04-26T12:00:00.000Z');
    const client = new EightSleepClient({
      fetchImpl,
      now: () => fixedNow,
      clientId: 'cid',
      clientSecret: 'csec',
    });
    const res = await client.authenticate('a@b.com', 'hunter2');

    expect(res.access_token).toBe('tok');
    expect(res.userId).toBe('user-1');
    // 3600s expiry minus 60s safety = 3540s after fixedNow
    expect(new Date(res.expires_at).toISOString()).toBe('2026-04-26T12:59:00.000Z');

    expect(fetched).toHaveLength(1);
    expect(fetched[0]?.url).toBe('https://auth-api.8slp.net/v1/tokens');
    const headers = (fetched[0]?.init.headers as Record<string, string>) ?? {};
    expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(headers['User-Agent']).toBe('okhttp/4.9.3');
    const body = new URLSearchParams(fetched[0]?.init.body as string);
    expect(body.get('grant_type')).toBe('password');
    expect(body.get('username')).toBe('a@b.com');
    expect(body.get('password')).toBe('hunter2');
    expect(body.get('client_id')).toBe('cid');
    expect(body.get('client_secret')).toBe('csec');
  });

  it('throws rate_limited on 429', async () => {
    const fetchImpl = fakeFetch(async () => new Response('', { status: 429 }));
    const client = new EightSleepClient({ fetchImpl });
    await expect(client.authenticate('a@b.com', 'p')).rejects.toMatchObject({
      name: 'EightSleepError',
      code: 'rate_limited',
      status: 429,
    });
  });

  it('throws auth error on 4xx', async () => {
    const fetchImpl = fakeFetch(async () => new Response('bad creds', { status: 401 }));
    const client = new EightSleepClient({ fetchImpl });
    await expect(client.authenticate('a@b.com', 'p')).rejects.toMatchObject({
      name: 'EightSleepError',
      code: 'auth',
    });
  });

  it('throws parse error on malformed payload', async () => {
    const fetchImpl = fakeFetch(async () => jsonResponse({ wrong: 'shape' }));
    const client = new EightSleepClient({ fetchImpl });
    await expect(client.authenticate('a@b.com', 'p')).rejects.toMatchObject({
      name: 'EightSleepError',
      code: 'parse',
    });
  });
});

describe('EightSleepClient.getMe', () => {
  it('returns userId and currentDeviceId', async () => {
    const fetched: string[] = [];
    const fetchImpl = fakeFetch(async (url, init) => {
      fetched.push(url);
      const headers = (init?.headers as Record<string, string>) ?? {};
      expect(headers.Authorization).toBe('Bearer tok');
      return jsonResponse({
        user: { userId: 'u1', email: 'a@b.com', currentDevice: { id: 'dev-9' } },
      });
    });
    const client = new EightSleepClient({ fetchImpl });
    const me = await client.getMe('tok');
    expect(me).toEqual({ userId: 'u1', currentDeviceId: 'dev-9' });
    expect(fetched[0]).toBe('https://client-api.8slp.net/v1/users/me');
  });

  it('translates 401 into unauthorized', async () => {
    const fetchImpl = fakeFetch(async () => new Response('expired', { status: 401 }));
    const client = new EightSleepClient({ fetchImpl });
    await expect(client.getMe('stale')).rejects.toMatchObject({
      name: 'EightSleepError',
      code: 'unauthorized',
    });
  });
});

describe('EightSleepClient.getTrends', () => {
  it('builds the v2 trends query and returns days oldest→newest', async () => {
    const fetched: string[] = [];
    const fetchImpl = fakeFetch(async (url) => {
      fetched.push(url);
      return jsonResponse({
        days: [
          {
            day: '2026-04-25',
            score: 82,
            sleepDurationSeconds: 25200,
            heartRate: 58,
            sleepQualityScore: { hrv: { score: 76 } },
          },
        ],
      });
    });
    const client = new EightSleepClient({ fetchImpl });
    const days = await client.getTrends('tok', 'u1', {
      from: '2026-04-25',
      to: '2026-04-26',
      timezone: 'America/New_York',
    });
    expect(days).toHaveLength(1);
    expect(days[0]?.score).toBe(82);
    expect(fetched[0]).toContain('/users/u1/trends?');
    expect(fetched[0]).toContain('from=2026-04-25');
    expect(fetched[0]).toContain('to=2026-04-26');
    expect(fetched[0]).toContain('include-all-sessions=true');
    expect(fetched[0]).toContain('model-version=v2');
    expect(fetched[0]).toContain('tz=America%2FNew_York');
  });

  it('returns empty array when API reports no days', async () => {
    const fetchImpl = fakeFetch(async () => jsonResponse({ days: [] }));
    const client = new EightSleepClient({ fetchImpl });
    const days = await client.getTrends('tok', 'u1', {
      from: '2026-04-25',
      to: '2026-04-26',
      timezone: 'UTC',
    });
    expect(days).toEqual([]);
  });
});

describe('EightSleepClient error class', () => {
  it('exports EightSleepError with discriminating code', () => {
    const err = new EightSleepError('rate_limited', 'x', 429);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('rate_limited');
    expect(err.status).toBe(429);
  });
});
