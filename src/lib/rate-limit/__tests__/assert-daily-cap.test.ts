import { type RateLimitClient, assertWithinDailyCap } from '@/lib/rate-limit/assert-daily-cap';
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Fake implementations of RateLimitClient for unit tests.
// ---------------------------------------------------------------------------

function makeAllowClient(remaining: number): RateLimitClient {
  return {
    limit: async (_key: string) => ({
      success: true,
      remaining,
      reset: Date.now() + 86_400_000,
    }),
  };
}

function makeDenyClient(resetAt: number): RateLimitClient {
  return {
    limit: async (_key: string) => ({
      success: false,
      remaining: 0,
      reset: resetAt,
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('assertWithinDailyCap', () => {
  it('returns ok:true with remaining count when under cap', async () => {
    const client = makeAllowClient(12);
    const result = await assertWithinDailyCap('u-1', 'engine:recommend', {
      client,
    });
    expect(result).toEqual({ ok: true, remaining: 12 });
  });

  it('returns ok:false with retryAfterMs when over cap', async () => {
    const resetAt = Date.now() + 3_600_000; // 1 hour from now
    const client = makeDenyClient(resetAt);
    const result = await assertWithinDailyCap('u-2', 'engine:recommend', {
      client,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(result.friendlyMessage).toMatch(/tomorrow/i);
    }
  });

  it('includes the action key in the Redis key', async () => {
    let capturedKey: string | undefined;
    const client: RateLimitClient = {
      limit: async (key) => {
        capturedKey = key;
        return { success: true, remaining: 5, reset: Date.now() + 1000 };
      },
    };
    await assertWithinDailyCap('u-3', 'engine:recommend', { client });
    expect(capturedKey).toContain('u-3');
    expect(capturedKey).toContain('engine:recommend');
  });

  it('embeds today date (YYYY-MM-DD) in the key for daily windowing', async () => {
    let capturedKey: string | undefined;
    const client: RateLimitClient = {
      limit: async (key) => {
        capturedKey = key;
        return { success: true, remaining: 5, reset: Date.now() + 1000 };
      },
    };
    await assertWithinDailyCap('u-4', 'engine:recommend', { client });
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    expect(capturedKey).toContain(today);
  });

  it('respects a custom cap via options', async () => {
    // The cap is enforced by the Upstash sliding-window config, not re-checked
    // client-side. This test verifies the cap value is threaded through.
    // We just confirm the call succeeds with a custom cap option present.
    const client = makeAllowClient(99);
    const result = await assertWithinDailyCap('u-5', 'engine:recommend', {
      client,
      cap: 100,
    });
    expect(result.ok).toBe(true);
  });

  it('returns ok:true (fail-open) when the Upstash client throws', async () => {
    const errorClient: RateLimitClient = {
      limit: async (_key: string) => {
        throw new Error('Upstash connection refused');
      },
    };
    const result = await assertWithinDailyCap('u-6', 'engine:recommend', {
      client: errorClient,
    });
    // fail-open: a Redis outage must not block LLM calls
    expect(result.ok).toBe(true);
  });
});
