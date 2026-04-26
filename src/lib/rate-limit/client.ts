/**
 * RateLimitClient — the narrow interface that assertWithinDailyCap depends on.
 * Tests inject a fake; production uses makeUpstashRateLimitClient().
 */
export interface RateLimitLimitResult {
  success: boolean;
  remaining: number;
  /** Unix timestamp (ms) when the window resets. */
  reset: number;
}

export interface RateLimitClient {
  limit(key: string): Promise<RateLimitLimitResult>;
}

/**
 * Factory for the real Upstash-backed rate-limit client.
 *
 * Uses a sliding-window algorithm keyed per userId + action + day. Because the
 * day is baked into the key (not into the window size), the cap resets cleanly
 * at midnight UTC without needing a 24h Upstash window (which would "slide"
 * across days rather than resetting at midnight).
 *
 * Cap defaults to RECOMMEND_DAILY_CAP env var (30 if unset).
 */
export function makeUpstashRateLimitClient(cap?: number): RateLimitClient {
  // Lazy imports — these modules are only resolved in a Node/edge runtime that
  // has the Upstash env vars set. Tests never call this factory.
  const { Redis } = require('@upstash/redis');
  const { Ratelimit } = require('@upstash/ratelimit');

  const resolvedCap = cap ?? Number.parseInt(process.env.RECOMMEND_DAILY_CAP ?? '30', 10);

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL ?? '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  });

  // Sliding window of 1 per second × cap = cap requests per 86400-second day.
  // We bake the date into the key instead, so the window is effectively daily.
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(resolvedCap, '86400 s'),
    analytics: true,
    prefix: 'wte:rl',
  });

  return {
    async limit(key: string): Promise<RateLimitLimitResult> {
      const { success, remaining, reset } = await ratelimit.limit(key);
      return { success, remaining, reset };
    },
  };
}
