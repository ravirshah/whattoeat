/**
 * assertWithinDailyCap — check whether a userId is within their daily cap for
 * a given action key. Returns a discriminated union; never throws.
 *
 * Key format: `{action}:{userId}:{YYYY-MM-DD}`
 * Example:    `engine:recommend:u-abc123:2026-04-26`
 *
 * Calling code must branch on `result.ok`:
 *
 *   const cap = await assertWithinDailyCap(userId, 'engine:recommend');
 *   if (!cap.ok) {
 *     return { error: cap.friendlyMessage };
 *   }
 *   // proceed
 */
import type { RateLimitClient } from './client';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type DailyCapOk = {
  ok: true;
  remaining: number;
};

export type DailyCapExceeded = {
  ok: false;
  retryAfterMs: number;
  friendlyMessage: string;
};

export type DailyCapResult = DailyCapOk | DailyCapExceeded;

// Re-export the interface so callers can build fakes without importing client.ts
export type { RateLimitClient } from './client';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface AssertDailyCapOptions {
  /** Inject a fake RateLimitClient in tests. Defaults to the Upstash client. */
  client?: RateLimitClient;
  /** Override the cap (requests/day). Defaults to RECOMMEND_DAILY_CAP env var. */
  cap?: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const FRIENDLY_MESSAGE =
  "You've hit your daily meal-suggestion limit — your AI chef needs a breather. " +
  'Come back tomorrow for a fresh batch of ideas!';

/**
 * Build the Redis key. The date is embedded so the window resets at midnight
 * UTC without relying on a 24-hour sliding window that would span two days.
 */
function buildKey(userId: string, action: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${action}:${userId}:${date}`;
}

export async function assertWithinDailyCap(
  userId: string,
  action: string,
  options: AssertDailyCapOptions = {},
): Promise<DailyCapResult> {
  let client = options.client;

  if (!client) {
    // Lazy-load the real client so test files that import this module without
    // setting Upstash env vars don't crash at import time.
    const { makeUpstashRateLimitClient } = await import('./client');
    client = makeUpstashRateLimitClient(options.cap);
  }

  const key = buildKey(userId, action);

  let result: Awaited<ReturnType<RateLimitClient['limit']>>;
  try {
    result = await client.limit(key);
  } catch (err) {
    // fail-open chosen — see commit msg
    console.warn('[rate-limit] upstash unreachable, allowing request:', err);
    return { ok: true, remaining: -1 };
  }

  if (result.success) {
    return { ok: true, remaining: result.remaining };
  }

  const retryAfterMs = Math.max(0, result.reset - Date.now());
  return {
    ok: false,
    retryAfterMs,
    friendlyMessage: FRIENDLY_MESSAGE,
  };
}
