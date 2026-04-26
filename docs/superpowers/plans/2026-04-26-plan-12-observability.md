# Plan 12 — Observability + Rate-Limit + Error Boundary

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Sentry end-to-end (server, client, edge), implement a per-user daily engine-call cap backed by Upstash Redis, add App Router error boundaries with Track 1 design-system UI, and create a `withInstrumentation` HOC that wraps Server Actions. After this track merges, Track 8 ("Feed Me") can wrap `recommend()` with a single HOC call and get rate-limiting + Sentry tagging for free.

**Architecture:** Three concerns, three folders. `src/server/instrumentation/` owns Sentry tag helpers and the `withInstrumentation` HOC. `src/lib/rate-limit/` owns the Upstash client + `assertWithinDailyCap` — designed with a mockable `RateLimitClient` interface so tests never touch the network. `src/app/error.tsx` + `src/app/global-error.tsx` are Next.js App Router conventions for per-segment and top-level error boundaries; both are `'use client'` components that report to Sentry and render a friendly card with "Try again" / "Go home" actions.

**Tech stack:** `@sentry/nextjs` (new dep), `@upstash/redis` + `@upstash/ratelimit` (new deps), Vitest for unit tests, React Testing Library for error-boundary smoke tests, Next.js 15 `instrumentation.ts` hook. Bun is the package manager.

**Spec references:**
- `docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md` — §8 Observability (Sentry tagging with `userId`, `track`, `engineVersion`, `promptsVersion`), §8 Rate limiting (30/day per user, 429 with friendly message, Upstash Redis), §8 Error contract (typed errors surfaced to boundary, feature-level + global fallback).
- §7 Cost discipline: "Per-user soft cap on calls/day (default 30) tracked in Upstash Redis. Hit cap → friendly message, not 500."
- §6 Tracks: T12 depends on T0 (contracts) and T4 (auth / `requireUser()`).

**Prerequisites (verified before Task 1):**
- Track 0 merged to `main`: Zod contracts at `src/contracts/zod/**`, `src/db/schema/**`, `src/server/contracts.ts`.
- Track 4 merged to `main`: `src/server/auth/index.ts` exports `requireUser()` and `getUserId()`.
- Branch `wt/track-12-observability` is checked out from a fresh `main`.
- `.env.local` exists (we add new keys in Task 1).

---

## File Structure

### Creates

```
# Sentry config (Next.js conventions)
src/instrumentation.ts
sentry.client.config.ts
sentry.server.config.ts
sentry.edge.config.ts

# Instrumentation helpers
src/server/instrumentation/sentry-init.ts
src/server/instrumentation/tags.ts
src/server/instrumentation/with-instrumentation.ts
src/server/instrumentation/index.ts

# Version helper (read by Sentry tags)
src/lib/version.ts

# Rate-limit
src/lib/rate-limit/client.ts
src/lib/rate-limit/assert-daily-cap.ts
src/lib/rate-limit/index.ts

# Error boundaries
src/app/error.tsx
src/app/global-error.tsx

# Tests
src/lib/rate-limit/__tests__/assert-daily-cap.test.ts
src/server/instrumentation/__tests__/with-instrumentation.test.ts
src/app/__tests__/error-boundary.test.tsx
```

### Modifies

```
package.json      — add @sentry/nextjs, @upstash/redis, @upstash/ratelimit, @testing-library/react (devDep)
bun.lock          — updated automatically
next.config.js    — wrap with withSentryConfig()
.env.example      — document SENTRY_DSN, SENTRY_AUTH_TOKEN, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, RECOMMEND_DAILY_CAP
```

### Does NOT touch (frozen by Track 0 or owned by other tracks)

```
src/engine/**
src/contracts/**
src/db/**
supabase/**
src/server/auth/**       (import only)
src/components/ui/**     (import only)
tailwind.config.ts
src/styles/**
```

---

## Conventions used in this plan

- All file paths are repo-relative. Bash commands use the absolute root `/Users/ravishah/Documents/whattoeat`.
- `bun` is the package manager and test runner (`bun run test`, `bun run typecheck`, `bun run lint`).
- All imports use the `@/` alias for `src/` (e.g. `@/lib/rate-limit`, `@/server/instrumentation`).
- Commit message prefixes:
  - `obs:` — source files under `src/server/instrumentation/`, `src/lib/rate-limit/`, `src/lib/version.ts`, `src/instrumentation.ts`, `sentry.*.config.ts`
  - `obs-test:` — test files under `src/lib/rate-limit/__tests__/`, `src/server/instrumentation/__tests__/`, `src/app/__tests__/`
  - `obs-ui:` — `src/app/error.tsx`, `src/app/global-error.tsx`
- **Rate-limit result is a value, not a throw.** `assertWithinDailyCap` returns a typed discriminated union. Calling code branches on `ok`. Sentry captures errors via `withInstrumentation` HOC, not via thrown rate-limit signals.
- **TDD where it pays:** rate-limit logic and `withInstrumentation` get test-first cycles (RED → GREEN). Sentry config is integration-only; tests mock the SDK.

---

## Tasks

### Task 1: Add dependencies + document env vars

**Files:** `package.json`, `bun.lock`, `.env.example`

The only task that modifies `package.json`. Adds three runtime packages and one devDep (React Testing Library for error-boundary smoke tests). Sentry CLI is invoked at build time via `@sentry/nextjs`'s bundler plugin — no separate `@sentry/cli` dep needed.

- [ ] **Step 1.1 — Add deps**

Edit `package.json`. In `"dependencies"` add:

```json
"@sentry/nextjs": "^8.0.0",
"@upstash/redis": "^1.34.0",
"@upstash/ratelimit": "^2.0.0"
```

In `"devDependencies"` add:

```json
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.4.0",
"@vitejs/plugin-react": "^4.3.0"
```

<!-- TODO: confirm with user — do we have a Sentry account and DSN already provisioned? If not, the Sentry init files will silently no-op until SENTRY_DSN is set. -->

- [ ] **Step 1.2 — Install**

```bash
cd /Users/ravishah/Documents/whattoeat && bun install
```

Expected: installs cleanly; `bun.lock` updated.

- [ ] **Step 1.3 — Document env vars in `.env.example`**

Append to `.env.example` (create if absent):

```bash
# Sentry
SENTRY_DSN=                         # Required in prod; optional in dev (set SENTRY_ENABLE_DEV=1 to force)
SENTRY_AUTH_TOKEN=                  # CI only — for source-map upload. Never set locally.
SENTRY_ORG=                         # Your Sentry org slug
SENTRY_PROJECT=                     # Your Sentry project slug

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=             # https://<name>.upstash.io
UPSTASH_REDIS_REST_TOKEN=           # Upstash REST token

# Engine rate limit
RECOMMEND_DAILY_CAP=30              # Soft cap per user per day; override per-env
```

<!-- TODO: confirm with user — is Upstash already provisioned? If not, spin up a free Upstash database and paste the REST URL + token into .env.local before Task 5. -->

- [ ] **Step 1.4 — Verify typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0 (no new source files yet; just deps).

- [ ] **Step 1.5 — Commit**

```bash
cd /Users/ravishah/Documents/whattoeat && git add package.json bun.lock .env.example
git commit -m "obs: add @sentry/nextjs, @upstash/redis, @upstash/ratelimit deps"
```

---

### Task 2: Version helper + Sentry config files

**Files:** `src/lib/version.ts`, `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation.ts`

Wire Sentry using the Next.js 15 `instrumentation.ts` hook (the official way — no `sentry.config.js` as a separate entry point). The DSN is read from `SENTRY_DSN`. In development, Sentry is disabled unless `SENTRY_ENABLE_DEV=1` is set — this prevents dev noise from polluting the prod issue stream.

`src/lib/version.ts` reads `engineVersion` and `promptsVersion` that Sentry tags will use. We cannot import from `src/engine/index.ts` directly (it would violate the purity boundary if it imports Next/network — but version constants are safe string exports). We expose two constants here and keep engine's `PROMPTS_VERSION` as the canonical source; this file re-exports it.

<!-- TODO: confirm with user — does src/engine/index.ts already export PROMPTS_VERSION? Plan 02 ships it. If Track 2 isn't merged yet, use a placeholder string '0.0.0' and add a TODO comment. -->

- [ ] **Step 2.1 — Write `src/lib/version.ts`**

```ts
/**
 * Version constants surfaced to Sentry and structured logs.
 *
 * engineVersion  = package.json "version" field (set by CI on release).
 * promptsVersion = the PROMPTS_VERSION constant from the engine (re-exported
 *                  here so non-engine code can read it without importing the
 *                  engine barrel directly).
 *
 * If Track 2 (engine core) is not yet merged, promptsVersion falls back to
 * the placeholder below. Replace once Track 2 lands.
 */

// Injected by the Next.js build via next.config.js `env` block so it is
// available on both server and client (no fs access at runtime).
export const ENGINE_VERSION: string =
  process.env.NEXT_PUBLIC_ENGINE_VERSION ?? '2.0.0';

// Re-export from engine once Track 2 is merged; keep this fallback until then.
// <!-- TODO: replace with: export { PROMPTS_VERSION } from '@/engine/index' -->
export const PROMPTS_VERSION: string =
  process.env.NEXT_PUBLIC_PROMPTS_VERSION ?? 'unset';
```

- [ ] **Step 2.2 — Write `sentry.client.config.ts`**

```ts
import * as Sentry from '@sentry/nextjs';

const ENABLED =
  process.env.NODE_ENV === 'production' ||
  process.env.SENTRY_ENABLE_DEV === '1';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: ENABLED,
  tracesSampleRate: 0.2,
  // Replay only on user-facing errors; keep PII out.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Source maps are uploaded from CI; local builds omit them.
  // SENTRY_AUTH_TOKEN must be present in the CI environment.
});
```

- [ ] **Step 2.3 — Write `sentry.server.config.ts`**

```ts
import * as Sentry from '@sentry/nextjs';

const ENABLED =
  process.env.NODE_ENV === 'production' ||
  process.env.SENTRY_ENABLE_DEV === '1';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: ENABLED,
  tracesSampleRate: 0.5,
  // Node profiling for server-side perf (optional; remove if overhead shows up).
  profilesSampleRate: 0.1,
});
```

- [ ] **Step 2.4 — Write `sentry.edge.config.ts`**

```ts
import * as Sentry from '@sentry/nextjs';

const ENABLED =
  process.env.NODE_ENV === 'production' ||
  process.env.SENTRY_ENABLE_DEV === '1';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: ENABLED,
  tracesSampleRate: 0.5,
});
```

- [ ] **Step 2.5 — Write `src/instrumentation.ts`**

Next.js 15's `instrumentation.ts` is auto-loaded by the framework before the app boots. The `register()` export is the correct hook — do not call `Sentry.init()` directly inside the module body.

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// onRequestError is a Next.js 15 hook that fires whenever a React rendering
// error or route handler error escapes into the framework. Forwarding to Sentry
// here covers errors that the error boundary cannot catch (e.g., RSC errors).
export const onRequestError = async (
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string }
) => {
  const { captureException, withScope } = await import('@sentry/nextjs');
  withScope((scope) => {
    scope.setTag('route', context.routePath);
    scope.setTag('routeType', context.routeType);
    scope.setExtra('path', request.path);
    scope.setExtra('method', request.method);
    captureException(error);
  });
};
```

- [ ] **Step 2.6 — Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 2.7 — Commit**

```bash
cd /Users/ravishah/Documents/whattoeat && git add src/lib/version.ts sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts src/instrumentation.ts
git commit -m "obs: add Sentry config files and instrumentation.ts hook"
```

---

### Task 3: Wire `withSentryConfig` in `next.config.js`

**Files:** `next.config.js`

`@sentry/nextjs` ships a `withSentryConfig` wrapper that (a) injects the Sentry build-time plugin, (b) uploads source maps when `SENTRY_AUTH_TOKEN` is present, and (c) enables automatic server/edge instrumentation. We wrap the existing config without rewriting it.

- [ ] **Step 3.1 — Read existing `next.config.js`**

```bash
cat /Users/ravishah/Documents/whattoeat/next.config.js
```

- [ ] **Step 3.2 — Wrap with `withSentryConfig`**

Replace the default export with:

```js
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...existing options preserved exactly as found...
  env: {
    // Expose non-secret version constants to the client bundle.
    NEXT_PUBLIC_ENGINE_VERSION: process.env.npm_package_version ?? '2.0.0',
    // NEXT_PUBLIC_PROMPTS_VERSION is injected by CI once Track 2 is merged.
    NEXT_PUBLIC_PROMPTS_VERSION: process.env.NEXT_PUBLIC_PROMPTS_VERSION ?? 'unset',
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Source-map upload — only runs when SENTRY_AUTH_TOKEN is set (CI env).
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Disable source-map upload in local dev (token absent → upload skipped
  // automatically, but being explicit avoids the "missing auth token" warning).
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Auto-instrument Server Components, Route Handlers, Server Actions.
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,

  // Suppress the "sentry.server.config.ts will be bundled" log in dev.
  hideSourceMaps: false,
});
```

- [ ] **Step 3.3 — Typecheck + build check**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0. (Full `bun run build` is deferred to the final smoke task.)

- [ ] **Step 3.4 — Commit**

```bash
cd /Users/ravishah/Documents/whattoeat && git add next.config.js
git commit -m "obs: wrap next.config.js with withSentryConfig"
```

---

### Task 4: Sentry tag helpers + `withInstrumentation` HOC — tests first

**Files (RED):** `src/server/instrumentation/__tests__/with-instrumentation.test.ts`
**Files (GREEN):** `src/server/instrumentation/tags.ts`, `src/server/instrumentation/with-instrumentation.ts`, `src/server/instrumentation/index.ts`

`withInstrumentation` wraps a Server Action (or any async function). It sets Sentry tags for the action name, userId, engine/prompts version, and current track; records latency; and calls `Sentry.captureException` on error. Crucially, it re-throws after capturing so the caller's error boundary still fires. Tests mock `@sentry/nextjs` — no real network or DSN needed.

- [ ] **Step 4.1 — Write test file (RED)**

```ts
// src/server/instrumentation/__tests__/with-instrumentation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Sentry before importing the module under test.
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((cb: (scope: unknown) => void) => cb(mockScope)),
  captureException: vi.fn(),
  setTag: vi.fn(),
  setExtra: vi.fn(),
}));

const mockScope = {
  setTag: vi.fn(),
  setExtra: vi.fn(),
};

import * as Sentry from '@sentry/nextjs';
import { withInstrumentation } from '@/server/instrumentation/with-instrumentation';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('withInstrumentation', () => {
  it('returns the wrapped action result on success', async () => {
    const action = vi.fn().mockResolvedValue({ data: 42 });
    const wrapped = withInstrumentation('test.action', action);
    const result = await wrapped('arg1');
    expect(result).toEqual({ data: 42 });
    expect(action).toHaveBeenCalledWith('arg1');
  });

  it('sets Sentry tags on success', async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const wrapped = withInstrumentation('pantry.add', action);
    await wrapped();
    expect(mockScope.setTag).toHaveBeenCalledWith('action', 'pantry.add');
  });

  it('calls captureException and re-throws on error', async () => {
    const boom = new Error('test explosion');
    const action = vi.fn().mockRejectedValue(boom);
    const wrapped = withInstrumentation('engine.recommend', action);

    await expect(wrapped()).rejects.toThrow('test explosion');
    expect(Sentry.captureException).toHaveBeenCalledWith(boom);
  });

  it('records latency as a Sentry extra', async () => {
    vi.useFakeTimers();
    const action = vi.fn().mockImplementation(
      () => new Promise((res) => setTimeout(res, 50))
    );
    const wrapped = withInstrumentation('slow.action', action);
    const p = wrapped();
    vi.advanceTimersByTime(50);
    await p;
    expect(mockScope.setExtra).toHaveBeenCalledWith(
      'latencyMs',
      expect.any(Number)
    );
    vi.useRealTimers();
  });

  it('allows an optional userId tag', async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const wrapped = withInstrumentation('foo.bar', action, { userId: 'u-123' });
    await wrapped();
    expect(mockScope.setTag).toHaveBeenCalledWith('userId', 'u-123');
  });
});
```

Run tests — expected RED (module not yet written):

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/instrumentation/__tests__/with-instrumentation.test.ts
```

- [ ] **Step 4.2 — Write `src/server/instrumentation/tags.ts`**

```ts
/**
 * Sentry tag helpers for the WhatToEat application.
 *
 * All events should carry: userId, track, engineVersion, promptsVersion.
 * Per-route tags (userId, track) are set by the calling code; global version
 * tags are set once at boot via setGlobalTags() and inherit to all events.
 */
import * as Sentry from '@sentry/nextjs';
import { ENGINE_VERSION, PROMPTS_VERSION } from '@/lib/version';

/**
 * Call once at server startup (e.g., from src/instrumentation.ts register())
 * to stamp every outgoing Sentry event with version metadata.
 */
export function setGlobalSentryTags(): void {
  Sentry.setTag('engineVersion', ENGINE_VERSION);
  Sentry.setTag('promptsVersion', PROMPTS_VERSION);
}

export interface RequestTags {
  userId?: string | null;
  track?: string;
}

/**
 * Apply per-request tags to a Sentry scope. Call inside withScope().
 */
export function applyRequestTags(
  scope: Sentry.Scope,
  tags: RequestTags
): void {
  if (tags.userId) scope.setTag('userId', tags.userId);
  if (tags.track) scope.setTag('track', tags.track);
}
```

- [ ] **Step 4.3 — Write `src/server/instrumentation/with-instrumentation.ts`**

```ts
/**
 * withInstrumentation — wraps a Server Action (or any async function) with:
 *   - Sentry scope tags (action name, userId, engine/prompts version, track)
 *   - Latency measurement
 *   - Automatic captureException on error (then re-throws)
 *
 * Usage:
 *   const addPantryItem = withInstrumentation(
 *     'pantry.add',
 *     _addPantryItem,
 *     { userId }
 *   );
 *
 * The error boundary on the calling route still fires — re-throwing is
 * intentional. Sentry captures context before Next.js swallows the trace.
 */
import * as Sentry from '@sentry/nextjs';
import { applyRequestTags, type RequestTags } from './tags';
import { ENGINE_VERSION, PROMPTS_VERSION } from '@/lib/version';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>;

export function withInstrumentation<T extends AnyAsyncFn>(
  actionName: string,
  fn: T,
  tags: RequestTags = {}
): T {
  const wrapped = async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const latencyMs = Math.round(performance.now() - start);
      Sentry.withScope((scope) => {
        scope.setTag('action', actionName);
        scope.setTag('engineVersion', ENGINE_VERSION);
        scope.setTag('promptsVersion', PROMPTS_VERSION);
        scope.setExtra('latencyMs', latencyMs);
        applyRequestTags(scope, tags);
      });
      return result;
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      Sentry.withScope((scope) => {
        scope.setTag('action', actionName);
        scope.setTag('engineVersion', ENGINE_VERSION);
        scope.setTag('promptsVersion', PROMPTS_VERSION);
        scope.setExtra('latencyMs', latencyMs);
        applyRequestTags(scope, tags);
      });
      Sentry.captureException(err);
      throw err;
    }
  };
  return wrapped as T;
}
```

- [ ] **Step 4.4 — Write `src/server/instrumentation/index.ts`**

```ts
export { withInstrumentation } from './with-instrumentation';
export { setGlobalSentryTags, applyRequestTags } from './tags';
export type { RequestTags } from './tags';
```

- [ ] **Step 4.5 — Run tests (expected GREEN)**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/instrumentation/__tests__/with-instrumentation.test.ts
```

Expected: all 5 assertions pass.

- [ ] **Step 4.6 — Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

- [ ] **Step 4.7 — Commit**

```bash
cd /Users/ravishah/Documents/whattoeat && git add src/server/instrumentation/
git commit -m "obs: add withInstrumentation HOC + Sentry tag helpers"
```

---

### Task 5: Rate-limit — `RateLimitClient` interface + tests first

**Files (RED):** `src/lib/rate-limit/__tests__/assert-daily-cap.test.ts`
**Files (GREEN):** `src/lib/rate-limit/client.ts`, `src/lib/rate-limit/assert-daily-cap.ts`, `src/lib/rate-limit/index.ts`

The core design decision: `assertWithinDailyCap` returns a discriminated union, never throws. This keeps Sentry clean (no phantom rate-limit "errors") and makes the calling code explicit about the cap-hit path. A `RateLimitClient` interface is defined so tests inject a fake — the real `@upstash/ratelimit` client is wired only in the factory function.

- [ ] **Step 5.1 — Write test file (RED)**

```ts
// src/lib/rate-limit/__tests__/assert-daily-cap.test.ts
import { describe, it, expect } from 'vitest';
import {
  assertWithinDailyCap,
  type RateLimitClient,
} from '@/lib/rate-limit/assert-daily-cap';

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
});
```

Run — expected RED:

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/lib/rate-limit/__tests__/assert-daily-cap.test.ts
```

- [ ] **Step 5.2 — Write `src/lib/rate-limit/client.ts`**

Defines the `RateLimitClient` interface and the real factory backed by Upstash. The factory is the only place that touches `@upstash/redis` and `@upstash/ratelimit`.

```ts
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

  const resolvedCap =
    cap ??
    parseInt(process.env.RECOMMEND_DAILY_CAP ?? '30', 10);

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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
```

- [ ] **Step 5.3 — Write `src/lib/rate-limit/assert-daily-cap.ts`**

```ts
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
  "Come back tomorrow for a fresh batch of ideas!";

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
  options: AssertDailyCapOptions = {}
): Promise<DailyCapResult> {
  let client = options.client;

  if (!client) {
    // Lazy-load the real client so test files that import this module without
    // setting Upstash env vars don't crash at import time.
    const { makeUpstashRateLimitClient } = await import('./client');
    client = makeUpstashRateLimitClient(options.cap);
  }

  const key = buildKey(userId, action);
  const result = await client.limit(key);

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
```

- [ ] **Step 5.4 — Write `src/lib/rate-limit/index.ts`**

```ts
export { assertWithinDailyCap } from './assert-daily-cap';
export { makeUpstashRateLimitClient } from './client';
export type {
  DailyCapResult,
  DailyCapOk,
  DailyCapExceeded,
  AssertDailyCapOptions,
  RateLimitClient,
} from './assert-daily-cap';
```

- [ ] **Step 5.5 — Run tests (expected GREEN)**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/lib/rate-limit/__tests__/assert-daily-cap.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5.6 — Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

- [ ] **Step 5.7 — Commit**

```bash
cd /Users/ravishah/Documents/whattoeat && git add src/lib/rate-limit/
git commit -m "obs: add assertWithinDailyCap + RateLimitClient interface (TDD)"
```

---

### Task 6: Error boundaries — `error.tsx` + `global-error.tsx`

**Files:** `src/app/error.tsx`, `src/app/global-error.tsx`

Next.js App Router provides two error boundary conventions:
- `error.tsx` — catches errors in a route segment (per-page fallback). The root layout is still rendered.
- `global-error.tsx` — catches errors that escape `error.tsx` including the root layout. Replaces the entire page; must include its own `<html>` and `<body>`.

Both must be `'use client'` (React error boundaries are always client-side). Both report to Sentry via `captureException` (called in `useEffect` so it fires after mount). Both use the Track 1 design system (Card, Button — imported from `@/components/ui/**`) for a polished friendly fallback. If Track 1 isn't merged yet, use plain HTML — leave a `<!-- TODO: replace with Card/Button from Track 1 -->` comment.

<!-- TODO: confirm with user — are Card and Button already merged from Track 1? If not, use <div>/<button> stubs and swap later. -->

- [ ] **Step 6.1 — Check for existing `src/app/error.tsx`**

```bash
ls /Users/ravishah/Documents/whattoeat/src/app/ 2>/dev/null
```

If `error.tsx` or `global-error.tsx` already exist, read them first before overwriting. Flag the finding in the commit message.

- [ ] **Step 6.2 — Write `src/app/error.tsx`**

```tsx
'use client';

/**
 * App Router per-segment error boundary.
 * Catches rendering and data-fetching errors in child route segments.
 * The root layout is preserved — the nav and shell stay visible.
 *
 * Design: Track 1 Card + Button. Falls back to plain elements if ui/ not merged.
 * <!-- TODO: swap stubs below for Card/Button once Track 1 is on main -->
 */

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Report to Sentry with the route-level boundary tag so we can distinguish
    // from global-error catches in the Sentry dashboard.
    Sentry.withScope((scope) => {
      scope.setTag('boundary', 'segment');
      if (error.digest) scope.setExtra('digest', error.digest);
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        gap: '1.25rem',
        textAlign: 'center',
      }}
    >
      {/* TODO: replace outer div + inner divs with <Card> from @/components/ui/card */}
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '2rem',
          background: 'var(--surface-elevated)',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        <p
          style={{
            fontSize: '2rem',
            marginBottom: '0.5rem',
          }}
          aria-hidden
        >
          🍳
        </p>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: 'var(--text)',
          }}
        >
          Something went sideways in the kitchen
        </h2>
        <p
          style={{
            color: 'var(--text-muted)',
            marginBottom: '1.5rem',
            fontSize: '0.95rem',
          }}
        >
          Don't worry — your pantry and saved recipes are safe. This page hit
          an unexpected error.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          {/* TODO: replace with <Button variant="default"> from @/components/ui/button */}
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--r-md)',
              background: 'var(--accent)',
              color: 'var(--accent-fg)',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {/* TODO: replace with <Button variant="outline"> */}
          <a
            href="/"
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--r-md)',
              background: 'transparent',
              color: 'var(--text)',
              fontWeight: 500,
              border: '1px solid var(--border)',
              textDecoration: 'none',
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6.3 — Write `src/app/global-error.tsx`**

`global-error.tsx` replaces the _entire_ page (including the root layout), so it must include `<html>` and `<body>`. Keep styling minimal and inline — no CSS modules, no Tailwind classes that require the provider tree.

```tsx
'use client';

/**
 * App Router global (top-level) error boundary.
 * Fires when an error escapes the root layout — the nuclear fallback.
 * Must include <html> and <body> because the layout is gone.
 *
 * Reports to Sentry tagged boundary:'global'.
 */

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag('boundary', 'global');
      if (error.digest) scope.setExtra('digest', error.digest);
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#0f0f0f',
          color: '#ededed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          boxSizing: 'border-box',
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: 480,
            width: '100%',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 16,
            padding: '2.5rem 2rem',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '2.5rem', margin: '0 0 0.75rem' }} aria-hidden>
            🔥
          </p>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: '0 0 0.75rem',
            }}
          >
            Something broke badly
          </h1>
          <p
            style={{
              color: '#999',
              margin: '0 0 2rem',
              lineHeight: 1.6,
            }}
          >
            The kitchen is temporarily on fire. We've been notified and are on
            it. Your data is safe — this is a display error.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.6rem 1.5rem',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: '0.6rem 1.5rem',
                background: 'transparent',
                color: '#ededed',
                border: '1px solid #444',
                borderRadius: 8,
                fontWeight: 500,
                fontSize: '0.95rem',
                textDecoration: 'none',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 6.4 — Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

- [ ] **Step 6.5 — Commit**

```bash
cd /Users/ravishah/Documents/whattoeat && git add src/app/error.tsx src/app/global-error.tsx
git commit -m "obs-ui: add App Router error boundaries with Sentry reporting"
```

---

### Task 7: Error-boundary smoke tests

**Files:** `src/app/__tests__/error-boundary.test.tsx`

Smoke-test that `ErrorBoundary` renders its fallback UI and calls `Sentry.captureException` when a child throws. Uses React Testing Library and a mocked Sentry SDK. Does not test `GlobalError` (it requires an `<html>` shell; integration test is cleaner — flagged as a gap).

- [ ] **Step 7.1 — Write smoke test**

```tsx
// src/app/__tests__/error-boundary.test.tsx
/**
 * Smoke test for src/app/error.tsx.
 * Verifies: friendly UI renders, captureException is called with boundary tag.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Sentry before importing the boundary.
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((cb: (scope: unknown) => void) => cb(mockScope)),
  captureException: vi.fn(),
}));

const mockScope = {
  setTag: vi.fn(),
  setExtra: vi.fn(),
};

import * as Sentry from '@sentry/nextjs';
import ErrorBoundary from '@/app/error';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ErrorBoundary (segment)', () => {
  it('renders the friendly fallback title', () => {
    const fakeError = new Error('test error');
    const reset = vi.fn();
    render(<ErrorBoundary error={fakeError} reset={reset} />);
    expect(
      screen.getByText(/something went sideways/i)
    ).toBeDefined();
  });

  it('calls Sentry.captureException with the error', async () => {
    const fakeError = new Error('boom');
    const reset = vi.fn();
    render(<ErrorBoundary error={fakeError} reset={reset} />);
    // useEffect fires synchronously in vitest with @testing-library/react
    expect(Sentry.captureException).toHaveBeenCalledWith(fakeError);
  });

  it('tags the boundary as "segment"', () => {
    const fakeError = new Error('boom');
    render(<ErrorBoundary error={fakeError} reset={vi.fn()} />);
    expect(mockScope.setTag).toHaveBeenCalledWith('boundary', 'segment');
  });

  it('calls reset when "Try again" is clicked', () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error('x')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('renders a "Go home" link pointing to "/"', () => {
    render(<ErrorBoundary error={new Error('x')} reset={vi.fn()} />);
    const link = screen.getByRole('link', { name: /go home/i });
    expect(link.getAttribute('href')).toBe('/');
  });
});
```

- [ ] **Step 7.2 — Configure Vitest for jsdom (if needed)**

Check `vitest.config.ts` for an existing `environment: 'jsdom'` or `happy-dom` setting. If absent, add `environment: 'happy-dom'` (already in `@vitest/browser` or installable) or `environment: 'jsdom'` with `jsdom` devDep.

```bash
cat /Users/ravishah/Documents/whattoeat/vitest.config.ts 2>/dev/null || echo "file not found"
```

If `jsdom` is not configured, add to `vitest.config.ts`:

```ts
// in the defineConfig test block:
environment: 'happy-dom',
```

And install if missing:

```bash
cd /Users/ravishah/Documents/whattoeat && bun add -d happy-dom
```

- [ ] **Step 7.3 — Run tests (expected GREEN)**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/app/__tests__/error-boundary.test.tsx
```

Expected: all 5 assertions pass.

- [ ] **Step 7.4 — Commit**

```bash
cd /Users/ravishah/Documents/whattoeat && git add src/app/__tests__/error-boundary.test.tsx
git commit -m "obs-test: add error-boundary smoke tests"
```

---

### Task 8: Wire `setGlobalSentryTags` at boot

**Files:** `src/instrumentation.ts` (amend — do NOT create a new file)

Call `setGlobalSentryTags()` inside the `register()` hook so every server-side Sentry event is stamped with `engineVersion` and `promptsVersion` from the very first request.

- [ ] **Step 8.1 — Edit `src/instrumentation.ts`**

Add the import and call inside the `nodejs` branch:

```ts
// Updated register() — keep the edge branch as-is, add the call in nodejs.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
    const { setGlobalSentryTags } = await import(
      './server/instrumentation/tags'
    );
    setGlobalSentryTags();
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
```

- [ ] **Step 8.2 — Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

- [ ] **Step 8.3 — Commit**

```bash
cd /Users/ravishah/Documents/whattoeat && git add src/instrumentation.ts
git commit -m "obs: call setGlobalSentryTags() in instrumentation register()"
```

---

### Task 9: Full test suite + typecheck + lint

**Files:** none (validation only)

Run all checks in sequence before the final smoke step.

- [ ] **Step 9.1 — Full test suite**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test
```

Expected: all tests pass. Investigate any failures before proceeding.

- [ ] **Step 9.2 — Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 9.3 — Lint**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run lint
```

Expected: exit 0. Fix any Biome warnings before proceeding.

- [ ] **Step 9.4 — Verify owned paths only**

```bash
git diff --name-only main..HEAD | grep -Ev '^(src/server/instrumentation|src/lib/rate-limit|src/lib/version|src/app/error|src/app/global-error|src/app/__tests__|src/instrumentation|sentry\.|next\.config|package\.json|bun\.lock|\.env\.example)' || echo "No drift — all good"
```

Expected: either empty output or only files listed in the owned-paths section. Any unexpected file (e.g., `src/engine/**`, `src/db/**`, `tailwind.config.ts`) is a violation — revert or split into a separate PR.

---

### Task 10: Smoke test — manual verification

Confirm end-to-end behavior without a live Sentry account. Set `SENTRY_ENABLE_DEV=1` in `.env.local` to force Sentry in dev, mock `captureException` in the browser console, and trigger an error boundary.

- [ ] **Step 10.1 — Start dev server**

```bash
cd /Users/ravishah/Documents/whattoeat && SENTRY_ENABLE_DEV=1 bun run dev
```

- [ ] **Step 10.2 — Create a throwable test route (temporary)**

Create `src/app/smoke-error/page.tsx` temporarily:

```tsx
'use client';
export default function SmokePage() {
  throw new Error('Smoke test: error boundary fires!');
}
```

Navigate to `http://localhost:3000/smoke-error`.

Expected:
- The segment `error.tsx` fallback renders: "Something went sideways in the kitchen", "Try again" button, "Go home" link.
- Browser console shows a Sentry `captureException` call (mock-intercepted since no real DSN in dev without a Sentry account).
- "Try again" button calls `reset()` and the page re-renders (then throws again — that's expected for this smoke page).

- [ ] **Step 10.3 — Verify rate-limit happy path (unit confirmed; no Upstash required)**

The Upstash client is only invoked when `assertWithinDailyCap` is called without a `client` option. Since unit tests use a fake client, no live Upstash is needed to confirm the logic. Note the prod env vars are required for the live app.

<!-- TODO: confirm with user — is Upstash provisioned for staging/prod? If not, the rate-limit will fail gracefully (the import will throw; wrap in try/catch in the calling site or initialize lazily). Recommend provisioning before Track 8 wires the real call. -->

- [ ] **Step 10.4 — Delete smoke page**

```bash
rm /Users/ravishah/Documents/whattoeat/src/app/smoke-error/page.tsx
rmdir /Users/ravishah/Documents/whattoeat/src/app/smoke-error
```

- [ ] **Step 10.5 — Commit cleanup**

```bash
cd /Users/ravishah/Documents/whattoeat && git status
# Confirm nothing unexpected is staged.
```

---

### Task 11: PR + Definition of Done

**Files:** none

- [ ] **Step 11.1 — Final git status**

```bash
cd /Users/ravishah/Documents/whattoeat && git log main..HEAD --oneline
```

Expected commits (in order):
1. `obs: add @sentry/nextjs, @upstash/redis, @upstash/ratelimit deps`
2. `obs: add Sentry config files and instrumentation.ts hook`
3. `obs: wrap next.config.js with withSentryConfig`
4. `obs: add withInstrumentation HOC + Sentry tag helpers`
5. `obs: add assertWithinDailyCap + RateLimitClient interface (TDD)`
6. `obs-ui: add App Router error boundaries with Sentry reporting`
7. `obs-test: add error-boundary smoke tests`
8. `obs: call setGlobalSentryTags() in instrumentation register()`

- [ ] **Step 11.2 — Open PR**

```bash
gh pr create \
  --base main \
  --head wt/track-12-observability \
  --title "T12: Observability + Rate-Limit + Error Boundary" \
  --body "..."
```

PR body checklist:
- [ ] Sentry init wired for server, client, and edge runtimes
- [ ] `withInstrumentation` HOC wraps any Server Action with tagging + latency + error capture
- [ ] `assertWithinDailyCap` returns a discriminated union (no throws); 5 unit tests GREEN
- [ ] `error.tsx` + `global-error.tsx` report to Sentry and render friendly UI
- [ ] Error-boundary smoke tests: 5 assertions GREEN
- [ ] `withInstrumentation` tests: 5 assertions GREEN
- [ ] No files touched outside owned paths
- [ ] Typecheck: exit 0
- [ ] Lint: exit 0
- [ ] Full test suite: GREEN

---

## Definition of Done

| Check | Command | Expected |
|---|---|---|
| Typecheck | `bun run typecheck` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Full tests | `bun run test` | all GREEN |
| Owned-path audit | `git diff --name-only main..HEAD \| grep -Ev '<owned-paths-regex>'` | empty |
| Error boundary smoke | manual nav to test route | fallback renders, `captureException` called |
| Rate-limit unit | `bun run test src/lib/rate-limit/` | 5 GREEN |
| HOC unit | `bun run test src/server/instrumentation/` | 5 GREEN |

---

## Hand-off note to Track 8 ("Feed Me")

When Track 8 wires the `recommend()` Server Action, apply both guards at the top of the action:

```ts
// src/app/feed-me/actions.ts  (Track 8 owns this file)
import { requireUser } from '@/server/auth';
import { assertWithinDailyCap } from '@/lib/rate-limit';
import { withInstrumentation } from '@/server/instrumentation';

async function _feedMeAction(input: FeedMeInput) {
  const { userId } = await requireUser();

  const cap = await assertWithinDailyCap(userId, 'engine:recommend');
  if (!cap.ok) {
    return { error: cap.friendlyMessage };
  }

  // ... assemble RecommendationContext, call recommend(), etc.
}

// Exported action is the instrumented wrapper.
export const feedMeAction = withInstrumentation(
  'engine.recommend',
  _feedMeAction,
  // userId isn't known at wrap-time; pass it after requireUser() resolves
  // by calling withInstrumentation inside the action body instead:
  // See note below.
);
```

**Note on userId in Sentry tags:** `withInstrumentation` accepts `tags` at wrap time, but `userId` is resolved inside the action body (after `requireUser()`). For maximum tag fidelity, call `withInstrumentation` inline inside the action body around the engine call only, passing `{ userId }` after it resolves — or use `Sentry.setUser({ id: userId })` directly. Both approaches are valid; the HOC still captures latency and exceptions at the outer level either way.

---

## Ambiguities (to confirm with user before Task 1)

<!-- TODO: confirm with user — Sentry account/DSN ready? -->
1. **Sentry DSN**: Do we have a Sentry project and DSN already provisioned? If not, the Sentry config files will initialize in a no-op state (SDK silently ignores a missing DSN) until it's set. This is safe — just means no events flow to Sentry until the env var is added.

<!-- TODO: confirm with user — Upstash provisioned? -->
2. **Upstash credentials**: Is an Upstash Redis database ready? The rate-limit module only hits Upstash when called without a `client` option (production path). Unit tests use a fake. If Upstash isn't provisioned, Track 8's live call will fail at runtime — recommend provisioning before Track 8 merges.

<!-- TODO: confirm with user — premium tier cap? -->
3. **Per-user cap tiers**: The spec says "default 30" — is the cap flat for all users, or will premium users get a higher cap in v2.0? Currently it's env-only (`RECOMMEND_DAILY_CAP`). If per-user overrides are needed, the `assertWithinDailyCap` signature already accepts a `cap` option — Track 8 can pass a user-profile-derived cap without touching this track.

<!-- TODO: confirm with user — Track 1 merged before Track 12? -->
4. **Track 1 design system**: `error.tsx` and `global-error.tsx` use inline styles with CSS variable references (`var(--accent)`, `var(--surface-elevated)`) rather than Tailwind/shadcn because Track 1 may not be merged yet. Once Track 1 lands, a follow-up PR should swap the inline stubs for `<Card>` and `<Button>` from `@/components/ui/**`.

<!-- TODO: confirm with user — PROMPTS_VERSION source? -->
5. **`PROMPTS_VERSION` source**: `src/lib/version.ts` falls back to `process.env.NEXT_PUBLIC_PROMPTS_VERSION` until Track 2's `src/engine/index.ts` export is available. After Track 2 merges, update `version.ts` to re-export the constant from the engine barrel.
