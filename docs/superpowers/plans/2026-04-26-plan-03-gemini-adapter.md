# Plan 03 — Gemini Adapter + Eval Harness Upgrade

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire a production-quality `GeminiLlmClient` that implements the `LlmClient` port, add thorough unit tests that mock the SDK fetch layer, upgrade the eval harness to support `--mode=real` for optional live API runs, and add an in-memory LRU cache keyed on `cacheKey` to avoid duplicate prompts within a single `recommend()` invocation. When this plan merges, Plan 08 (Feed Me) can instantiate `GeminiLlmClient` directly from `src/server/adapters/gemini-llm.ts` without touching engine internals.

**Architecture:** The Gemini SDK (`@google/generative-ai`) is a network-bound third-party dependency and therefore lives in `src/server/adapters/` — outside `src/engine/`. The engine only ever sees the `LlmClient` interface defined in `src/engine/ports/llm.ts`. This boundary is enforced by `src/engine/_purity.test.ts` (ships in Track 0, never edited). The adapter converts Zod schemas to JSON Schema via `zod-to-json-schema` (already a devDep from Track 2), calls the Gemini API, maps errors to the shapes the engine already handles, and returns the `LlmGenerateResult<T>` value the engine expects. The eval harness upgrade is the only modification to `src/engine/eval/` — no other engine files are touched.

**Tech Stack:** `@google/generative-ai` (runtime dep, installed in Task 1), `zod-to-json-schema` (already in devDeps from Plan 02), Vitest with `vi.mock()` for adapter tests, `AbortController` for timeout, a hand-rolled 50-slot LRU keyed on `cacheKey`.

**Spec reference:** `docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md` — §4 (Decision Engine Contract / LlmClient port), §5 (Design System — referenced to locate the "Gemini" call-out), §7 (LLM pipeline — two-call architecture, model selection, cost discipline), §8 (Secrets / env, Observability).

**Prerequisites (verified before Task 1):**
- Track 0 is merged to `main`: `src/engine/ports/llm.ts` is frozen and exports `LlmClient`, `LlmGenerateArgs`, `LlmGenerateResult`.
- Track 2 is merged to `main`: `src/engine/errors.ts` exports `LlmInvalidJsonError`, `LlmRefusalError`, `EngineTimeoutError`; `src/engine/eval/run.ts` exists and passes in fake mode.
- `bun run test` exits 0 on `main`.
- Branch `wt/track-3-gemini-adapter` is checked out from a fresh `main`.

---

## File Structure

### Creates

```
src/server/adapters/gemini-llm.ts          — GeminiLlmClient implementation
src/server/adapters/lru-cache.ts           — hand-rolled 50-slot in-memory LRU
src/server/adapters/__tests__/gemini-llm.test.ts   — adapter unit tests (mocked SDK)
src/server/adapters/__tests__/lru-cache.test.ts    — LRU unit tests
```

### Modifies

```
package.json              — add @google/generative-ai runtime dep (Task 1 only)
bun.lock                  — updated automatically
.env.example              — add GEMINI_API_KEY, GEMINI_MODEL_CHEAP, GEMINI_MODEL_QUALITY
src/engine/eval/run.ts    — add --mode=real|fake flag (Task 12 only)
```

### Does NOT touch (file-ownership rule)

```
src/engine/ports/**         — frozen by Track 0
src/engine/errors.ts        — frozen by Track 2
src/engine/recommend.ts     — frozen by Track 2
src/engine/prompt.ts        — frozen by Track 2
src/engine/score.ts         — frozen by Track 2
src/engine/filter.ts        — frozen by Track 2
src/engine/index.ts         — frozen by Track 2
src/engine/__fixtures__/**  — frozen by Track 2
src/engine/__tests__/**     — frozen by Track 2 (except eval/)
src/engine/eval/schema.ts   — frozen by Track 2
src/engine/eval/dataset.json — frozen by Track 2
src/engine/eval/harness.ts  — frozen by Track 2
src/engine/_purity.test.ts  — frozen by Track 0
src/engine/types.ts         — frozen by Track 0
src/contracts/zod/**        — frozen by Track 0
src/db/**                   — frozen by Track 0
src/components/**           — not this track
src/app/**                  — not this track
supabase/**                 — not this track
```

---

## Conventions

- All file paths are repo-relative; absolute paths in bash commands use `/Users/ravishah/Documents/whattoeat`.
- `bun` is the package manager and test runner (`bun run test`, `bun run typecheck`).
- All adapter imports use the `@/` alias (`@/engine/ports/llm`, `@/server/adapters/...`).
- Commit message prefixes: `adapter:` for `src/server/adapters/` source files, `adapter-test:` for `src/server/adapters/__tests__/**`, `eval:` for `src/engine/eval/` changes.
- **Purity gate** (`bun run test src/engine/_purity.test.ts`) must remain GREEN after every commit. The adapter lives in `src/server/`, not `src/engine/`, so it cannot accidentally fail purity — but verify after the eval harness task anyway.
- **TDD discipline:** every test task runs first (expected RED), then the implementation task makes it GREEN. Steps are annotated `— expected RED` or `— expected GREEN` accordingly.

---

## Tasks

### Task 1: Install `@google/generative-ai` runtime dep

**Files:** `package.json`, `bun.lock`

This is the only task that modifies `package.json`. The Google Generative AI SDK provides the `GoogleGenerativeAI` client, `GenerativeModel`, and `HarmCategory`/`HarmBlockThreshold` enums needed for safety configuration. No other tasks touch `package.json`.

- [ ] **Step 1: Add runtime dep**

Edit `package.json` — add to `"dependencies"`:

```json
"@google/generative-ai": "^0.21.0"
```

- [ ] **Step 2: Install**

```bash
cd /Users/ravishah/Documents/whattoeat && bun install
```

Expected: exits 0; `bun.lock` updated with the new package.

- [ ] **Step 3: Verify typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "adapter: install @google/generative-ai runtime dep"
```

---

### Task 2: Update `.env.example` with Gemini env vars

**Files:** `.env.example`

Add the three Gemini-specific env vars below the existing `GEMINI_API_KEY` line (which is already present from v1 era). Remove the `NEXT_PUBLIC_GEMINI_API_KEY` line — the key must never be exposed to the browser.

<!-- TODO: confirm with user — should we keep NEXT_PUBLIC_GEMINI_API_KEY for any client-side feature, or is server-only correct? Treating as server-only (no NEXT_PUBLIC_) for now per §8 security rules. -->

- [ ] **Step 1: Edit `.env.example`**

Replace the old Firebase/Gemini block with the clean v2.0 env surface. The Gemini section should read:

```bash
# Gemini LLM adapter
GEMINI_API_KEY=your_gemini_api_key_here
# Optional: override model names. Defaults shown.
GEMINI_MODEL_CHEAP=gemini-1.5-flash
GEMINI_MODEL_QUALITY=gemini-1.5-pro
```

Remove `NEXT_PUBLIC_GEMINI_API_KEY` — the API key must never ship to the browser.

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "adapter: add GEMINI_API_KEY + model env vars to .env.example"
```

---

### Task 3: Write LRU cache unit tests (RED)

**Files:** `src/server/adapters/__tests__/lru-cache.test.ts`

Write the tests before the implementation exists. All tests should fail at import time or at runtime with a clear error.

- [ ] **Step 1: Create test directory**

```bash
mkdir -p /Users/ravishah/Documents/whattoeat/src/server/adapters/__tests__
```

- [ ] **Step 2: Write `lru-cache.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { LruCache } from '@/server/adapters/lru-cache';

describe('LruCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = new LruCache<string>(3);
    expect(cache.get('x')).toBeUndefined();
  });

  it('stores and retrieves a value', () => {
    const cache = new LruCache<string>(3);
    cache.set('a', 'alpha');
    expect(cache.get('a')).toBe('alpha');
  });

  it('evicts the least-recently-used entry when at capacity', () => {
    const cache = new LruCache<number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    // 'a' is LRU — access 'b' and 'c' to push 'a' to the back
    cache.get('b');
    cache.get('c');
    cache.set('d', 4); // should evict 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('d')).toBe(4);
  });

  it('promotes a recently accessed key (get refreshes LRU order)', () => {
    const cache = new LruCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' is now MRU; 'b' is LRU
    cache.set('c', 3); // should evict 'b', not 'a'
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  it('promotes a key on set if it already exists', () => {
    const cache = new LruCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 99); // update 'a'; 'b' is now LRU
    cache.set('c', 3);  // should evict 'b'
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(99);
  });

  it('handles a capacity of 1', () => {
    const cache = new LruCache<string>(1);
    cache.set('a', 'alpha');
    cache.set('b', 'beta'); // evicts 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('beta');
  });

  it('reports size correctly', () => {
    const cache = new LruCache<number>(5);
    expect(cache.size).toBe(0);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);
  });
});
```

- [ ] **Step 3: Run tests — expected RED**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/adapters/__tests__/lru-cache.test.ts
```

Expected: all tests fail (cannot find module `@/server/adapters/lru-cache`).

- [ ] **Step 4: Commit**

```bash
git add src/server/adapters/__tests__/lru-cache.test.ts
git commit -m "adapter-test: LruCache unit tests (RED)"
```

---

### Task 4: Implement `LruCache` (GREEN)

**Files:** `src/server/adapters/lru-cache.ts`

A hand-rolled doubly-linked-list LRU. No external deps; default capacity 50 slots (the adapter instantiates with 50).

- [ ] **Step 1: Create adapter directory**

```bash
mkdir -p /Users/ravishah/Documents/whattoeat/src/server/adapters
```

- [ ] **Step 2: Write `lru-cache.ts`**

```ts
/** Doubly-linked-list node. */
interface Node<V> {
  key: string;
  value: V;
  prev: Node<V> | null;
  next: Node<V> | null;
}

/**
 * Simple in-memory LRU cache.
 * Evicts the least-recently-used entry when `capacity` is exceeded.
 * get() and set() are both O(1).
 */
export class LruCache<V> {
  private readonly map = new Map<string, Node<V>>();
  private head: Node<V> | null = null; // most-recently used
  private tail: Node<V> | null = null; // least-recently used

  constructor(private readonly capacity: number) {
    if (capacity < 1) throw new RangeError('LruCache capacity must be >= 1');
  }

  get size(): number {
    return this.map.size;
  }

  get(key: string): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.promote(node);
    return node.value;
  }

  set(key: string, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.promote(existing);
      return;
    }
    const node: Node<V> = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this.prepend(node);
    if (this.map.size > this.capacity) {
      this.evict();
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Move an existing node to the head (most-recently used). */
  private promote(node: Node<V>): void {
    if (node === this.head) return;
    this.unlink(node);
    this.prepend(node);
  }

  /** Insert a node at the head. */
  private prepend(node: Node<V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  /** Detach a node from the list without removing from map. */
  private unlink(node: Node<V>): void {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
    node.prev = null;
    node.next = null;
  }

  /** Remove the tail (LRU). */
  private evict(): void {
    if (!this.tail) return;
    this.map.delete(this.tail.key);
    this.unlink(this.tail);
  }
}
```

- [ ] **Step 3: Run tests — expected GREEN**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/adapters/__tests__/lru-cache.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 4: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/server/adapters/lru-cache.ts
git commit -m "adapter: implement in-memory LRU cache (50-slot default)"
```

---

### Task 5: Write `GeminiLlmClient` unit tests (RED)

**Files:** `src/server/adapters/__tests__/gemini-llm.test.ts`

Write all adapter tests before the implementation. The Gemini SDK fetch layer is mocked with `vi.mock()` — no real API calls are made. Tests cover: success path, schema parse failure, timeout via AbortController, safety block / refusal, and `modelHint` routing.

- [ ] **Step 1: Write `gemini-llm.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Mock the entire @google/generative-ai module before importing the adapter.
// ---------------------------------------------------------------------------
const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
    HarmCategory: {
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    },
    HarmBlockThreshold: {
      BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
    },
  };
});

// Import after mock is registered.
import { GeminiLlmClient } from '@/server/adapters/gemini-llm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DishSchema = z.object({
  name: z.string(),
  calories: z.number(),
});

type Dish = z.infer<typeof DishSchema>;

function makeSuccessResponse(json: unknown, modelName = 'gemini-1.5-flash') {
  return {
    response: {
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(json) }],
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: {
        promptTokenCount: 120,
        candidatesTokenCount: 40,
      },
      modelVersion: modelName,
    },
  };
}

function makeSafetyBlockResponse() {
  return {
    response: {
      candidates: [
        {
          content: { parts: [{ text: '' }] },
          finishReason: 'SAFETY',
        },
      ],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 0 },
      modelVersion: 'gemini-1.5-flash',
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GeminiLlmClient', () => {
  let client: GeminiLlmClient;

  beforeEach(() => {
    process.env['GEMINI_API_KEY'] = 'test-key-abc';
    client = new GeminiLlmClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env['GEMINI_API_KEY'];
    delete process.env['GEMINI_MODEL_CHEAP'];
    delete process.env['GEMINI_MODEL_QUALITY'];
  });

  // -------------------------------------------------------------------------
  // Success path
  // -------------------------------------------------------------------------

  it('parses a valid response and returns typed value + token counts', async () => {
    const dish: Dish = { name: 'Grilled Chicken', calories: 350 };
    mockGenerateContent.mockResolvedValueOnce(makeSuccessResponse(dish));

    const result = await client.generateStructured({
      system: 'You are a chef.',
      user: 'Suggest a healthy dish.',
      schema: DishSchema,
    });

    expect(result.value).toEqual(dish);
    expect(result.tokens.prompt).toBe(120);
    expect(result.tokens.completion).toBe(40);
    expect(result.modelUsed).toContain('gemini');
  });

  // -------------------------------------------------------------------------
  // Cache: repeated cacheKey returns cached value without calling SDK again
  // -------------------------------------------------------------------------

  it('returns cached result for a repeated cacheKey without a second SDK call', async () => {
    const dish: Dish = { name: 'Salad', calories: 200 };
    mockGenerateContent.mockResolvedValueOnce(makeSuccessResponse(dish));

    const args = {
      system: 'chef',
      user: 'suggest',
      schema: DishSchema,
      cacheKey: 'unique-key-1',
    };

    const first = await client.generateStructured(args);
    const second = await client.generateStructured(args);

    expect(second.value).toEqual(first.value);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1); // SDK called only once
  });

  it('does not share cache between different cacheKeys', async () => {
    const dish1: Dish = { name: 'Pasta', calories: 500 };
    const dish2: Dish = { name: 'Soup', calories: 150 };
    mockGenerateContent
      .mockResolvedValueOnce(makeSuccessResponse(dish1))
      .mockResolvedValueOnce(makeSuccessResponse(dish2));

    await client.generateStructured({ system: 's', user: 'u', schema: DishSchema, cacheKey: 'k1' });
    await client.generateStructured({ system: 's', user: 'u', schema: DishSchema, cacheKey: 'k2' });

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Schema parse failure → LlmInvalidJsonError
  // -------------------------------------------------------------------------

  it('throws an error containing "Schema validation" when the response fails Zod parse', async () => {
    // Return JSON that does not match DishSchema (missing "calories")
    mockGenerateContent.mockResolvedValue(
      makeSuccessResponse({ name: 'Bad Dish' /* no calories */ }),
    );

    await expect(
      client.generateStructured({ system: 's', user: 'u', schema: DishSchema }),
    ).rejects.toThrow(/Schema validation/i);
  });

  // -------------------------------------------------------------------------
  // Timeout → error with isTimeout=true
  // -------------------------------------------------------------------------

  it('throws a timeout error (isTimeout=true) when SDK call exceeds timeoutMs', async () => {
    mockGenerateContent.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 5_000)),
    );

    const promise = client.generateStructured({
      system: 's',
      user: 'u',
      schema: DishSchema,
      timeoutMs: 50, // 50 ms — much shorter than the 5 s mock delay
    });

    await expect(promise).rejects.toMatchObject({ isTimeout: true });
  });

  // -------------------------------------------------------------------------
  // Safety block / refusal → error containing 'refusal'
  // -------------------------------------------------------------------------

  it('throws an error containing "refusal" when the response is blocked for safety', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeSafetyBlockResponse());

    await expect(
      client.generateStructured({ system: 's', user: 'u', schema: DishSchema }),
    ).rejects.toThrow(/refusal/i);
  });

  // -------------------------------------------------------------------------
  // modelHint routing
  // -------------------------------------------------------------------------

  it('uses the cheap model (gemini-1.5-flash) by default', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const getGenerativeModelSpy = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent.mockResolvedValueOnce(
        makeSuccessResponse({ name: 'Dish', calories: 100 }),
      ),
    });
    vi.mocked(GoogleGenerativeAI).mockImplementationOnce(() => ({
      getGenerativeModel: getGenerativeModelSpy,
    }) as never);

    const freshClient = new GeminiLlmClient();
    await freshClient.generateStructured({ system: 's', user: 'u', schema: DishSchema });

    expect(getGenerativeModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-1.5-flash' }),
    );
  });

  it('uses the quality model (gemini-1.5-pro) when modelHint is "strong"', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const getGenerativeModelSpy = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent.mockResolvedValueOnce(
        makeSuccessResponse({ name: 'Dish', calories: 100 }, 'gemini-1.5-pro'),
      ),
    });
    vi.mocked(GoogleGenerativeAI).mockImplementationOnce(() => ({
      getGenerativeModel: getGenerativeModelSpy,
    }) as never);

    const freshClient = new GeminiLlmClient();
    await freshClient.generateStructured({
      system: 's',
      user: 'u',
      schema: DishSchema,
      modelHint: 'strong',
    });

    expect(getGenerativeModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-1.5-pro' }),
    );
  });

  it('respects GEMINI_MODEL_CHEAP env override', async () => {
    process.env['GEMINI_MODEL_CHEAP'] = 'gemini-2.0-flash-lite';
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const getGenerativeModelSpy = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent.mockResolvedValueOnce(
        makeSuccessResponse({ name: 'Dish', calories: 100 }),
      ),
    });
    vi.mocked(GoogleGenerativeAI).mockImplementationOnce(() => ({
      getGenerativeModel: getGenerativeModelSpy,
    }) as never);

    const envClient = new GeminiLlmClient();
    await envClient.generateStructured({ system: 's', user: 'u', schema: DishSchema });

    expect(getGenerativeModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.0-flash-lite' }),
    );
  });

  // -------------------------------------------------------------------------
  // Missing API key → throws on construction
  // -------------------------------------------------------------------------

  it('throws immediately if GEMINI_API_KEY is not set', () => {
    delete process.env['GEMINI_API_KEY'];
    expect(() => new GeminiLlmClient()).toThrow(/GEMINI_API_KEY/);
  });
});
```

- [ ] **Step 2: Run tests — expected RED**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/adapters/__tests__/gemini-llm.test.ts
```

Expected: all tests fail (cannot find module `@/server/adapters/gemini-llm`).

- [ ] **Step 3: Commit**

```bash
git add src/server/adapters/__tests__/gemini-llm.test.ts
git commit -m "adapter-test: GeminiLlmClient unit tests (RED)"
```

---

### Task 6: Implement `GeminiLlmClient` (GREEN — part 1: skeleton + error mapping)

**Files:** `src/server/adapters/gemini-llm.ts`

Build the class skeleton, error classes, the model-routing helper, and the abort/timeout plumbing. The `generateStructured` body is stubbed (throws) — the next task fills in the full implementation. Split across two tasks for smaller diffs.

<!-- TODO: confirm with user — spec §7 mentions "1 retry on schema-validation failure". Plan 02 engine errors.ts treats LlmInvalidJsonError as a signal the adapter threw after retry; retry logic is adapter-side. Retry implemented in Task 7. -->

- [ ] **Step 1: Write initial `gemini-llm.ts` skeleton**

```ts
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  type GenerateContentResult,
} from '@google/generative-ai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodSchema } from 'zod';
import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from '@/engine/ports/llm';
import type { TokenUsage } from '@/contracts/zod';
import { LruCache } from './lru-cache';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CHEAP_MODEL = 'gemini-1.5-flash';
const DEFAULT_QUALITY_MODEL = 'gemini-1.5-pro';
const DEFAULT_TIMEOUT_MS = 30_000;
const CACHE_CAPACITY = 50;

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/** Thrown when the Gemini SDK call times out. `isTimeout` is true for engine mapping. */
export class GeminiTimeoutError extends Error {
  readonly isTimeout = true as const;
  constructor(timeoutMs: number) {
    super(`Gemini request timed out after ${timeoutMs}ms`);
    this.name = 'GeminiTimeoutError';
  }
}

/** Thrown when Gemini returns SAFETY or RECITATION finish reason. */
export class GeminiRefusalError extends Error {
  constructor(finishReason: string) {
    super(`LLM refusal: Gemini blocked response (finishReason=${finishReason})`);
    this.name = 'GeminiRefusalError';
  }
}

/** Thrown when Gemini response text fails Zod schema validation after retry. */
export class GeminiSchemaError extends Error {
  constructor(zodMessage: string) {
    super(`Schema validation failed: ${zodMessage}`);
    this.name = 'GeminiSchemaError';
  }
}

// ---------------------------------------------------------------------------
// Safety settings (permissive — we rely on engine allergen filter instead)
// ---------------------------------------------------------------------------

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// ---------------------------------------------------------------------------
// GeminiLlmClient
// ---------------------------------------------------------------------------

export class GeminiLlmClient implements LlmClient {
  private readonly genAI: GoogleGenerativeAI;
  private readonly cheapModel: string;
  private readonly qualityModel: string;
  private readonly cache = new LruCache<LlmGenerateResult<unknown>>(CACHE_CAPACITY);

  constructor() {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY environment variable is not set. ' +
          'Set it in .env.local (local) or Vercel Project Settings (prod).',
      );
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.cheapModel =
      process.env['GEMINI_MODEL_CHEAP'] ?? DEFAULT_CHEAP_MODEL;
    this.qualityModel =
      process.env['GEMINI_MODEL_QUALITY'] ?? DEFAULT_QUALITY_MODEL;
  }

  async generateStructured<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    // Check cache first (keyed on cacheKey when provided)
    if (args.cacheKey) {
      const cached = this.cache.get(args.cacheKey) as LlmGenerateResult<T> | undefined;
      if (cached) return cached;
    }

    const result = await this.callWithRetry(args);

    if (args.cacheKey) {
      this.cache.set(args.cacheKey, result as LlmGenerateResult<unknown>);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Private: call with one retry on schema-validation failure
  // ---------------------------------------------------------------------------

  private async callWithRetry<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    try {
      return await this.callOnce(args);
    } catch (err) {
      // Only retry on schema validation failures (not timeouts or refusals)
      if (err instanceof GeminiSchemaError) {
        const retryArgs: LlmGenerateArgs<T> = {
          ...args,
          user:
            args.user +
            `\n\n[RETRY] Your previous response failed schema validation: ${err.message}. Please fix and respond with valid JSON only.`,
        };
        return await this.callOnce(retryArgs);
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Private: single SDK call with timeout + error mapping
  // ---------------------------------------------------------------------------

  private async callOnce<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    const modelName = args.modelHint === 'strong' ? this.qualityModel : this.cheapModel;
    const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const model = this.genAI.getGenerativeModel({
      model: modelName,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: zodToJsonSchema(args.schema) as never,
      },
    });

    // Build the prompt parts (system + user combined via content array)
    const contents = [
      {
        role: 'user' as const,
        parts: [{ text: `${args.system}\n\n---\n\n${args.user}` }],
      },
    ];

    // Abort controller for timeout enforcement
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let raw: GenerateContentResult;
    try {
      raw = await model.generateContent({ contents });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (
        controller.signal.aborted ||
        (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted')))
      ) {
        throw new GeminiTimeoutError(timeoutMs);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    // Check finish reason for safety/refusal blocks
    const candidate = raw.response.candidates?.[0];
    if (!candidate) {
      throw new GeminiRefusalError('NO_CANDIDATES');
    }
    const finishReason = candidate.finishReason;
    if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
      throw new GeminiRefusalError(String(finishReason));
    }

    // Extract text and parse JSON
    const text = candidate.content.parts[0]?.text ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new GeminiSchemaError(`Response was not valid JSON: ${text.slice(0, 200)}`);
    }

    // Validate against Zod schema
    const zodResult = args.schema.safeParse(parsed);
    if (!zodResult.success) {
      throw new GeminiSchemaError(zodResult.error.message);
    }

    // Extract token usage from response metadata
    const usage = raw.response.usageMetadata;
    const tokens: TokenUsage = {
      prompt: usage?.promptTokenCount ?? 0,
      completion: usage?.candidatesTokenCount ?? 0,
    };

    return {
      value: zodResult.data,
      tokens,
      modelUsed: raw.response.modelVersion ?? modelName,
    };
  }
}
```

- [ ] **Step 2: Run adapter tests — expected GREEN**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/adapters/__tests__/gemini-llm.test.ts
```

Expected: all adapter tests pass.

- [ ] **Step 3: Run LRU tests — still GREEN**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/adapters/__tests__/lru-cache.test.ts
```

Expected: all LRU tests still pass.

- [ ] **Step 4: Purity gate (adapter is in server/, not engine/ — should be unaffected)**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/engine/_purity.test.ts
```

Expected: GREEN (no imports from forbidden packages inside `src/engine/`).

- [ ] **Step 5: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/server/adapters/gemini-llm.ts
git commit -m "adapter: implement GeminiLlmClient with LRU cache, timeout, error mapping"
```

---

### Task 7: Verify modelHint routing and error shape integration

**Files:** `src/server/adapters/__tests__/gemini-llm.test.ts` (read-only verify), no new files.

This task is a pure verification step — all implementation is done. Run the full adapter test suite and confirm the error message strings align with what `src/engine/errors.ts` expects so the engine can map them correctly.

Engine mapping expectations (from `src/engine/errors.ts` and Plan 02):
- `LlmInvalidJsonError` — engine catches errors where `message.includes('Schema validation')`.
- `LlmRefusalError` — engine catches errors where `message.includes('refusal')`.
- `EngineTimeoutError` — engine catches errors where `err.isTimeout === true`.

All three shapes are covered by `GeminiSchemaError`, `GeminiRefusalError`, and `GeminiTimeoutError` respectively.

- [ ] **Step 1: Verify error message strings match engine expectations**

```bash
cd /Users/ravishah/Documents/whattoeat && grep -n 'Schema validation\|refusal\|isTimeout' src/server/adapters/gemini-llm.ts
```

Expected output (line numbers may vary):

```
<line>:    super(`Schema validation failed: ${zodMessage}`);
<line>:    super(`LLM refusal: Gemini blocked response (finishReason=${finishReason})`);
<line>:  readonly isTimeout = true as const;
```

- [ ] **Step 2: Run full adapter test suite**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/adapters/
```

Expected: all tests pass (7 LRU + ~12 gemini-llm = ~19 total).

- [ ] **Step 3: Commit (verification only — no code changes)**

```bash
git commit --allow-empty -m "adapter-test: verify error shapes align with engine error mapping"
```

---

### Task 8: Typecheck + lint pass on adapter layer

**Files:** (no changes — verification only)

- [ ] **Step 1: Full typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0 with no diagnostics in `src/server/adapters/`.

- [ ] **Step 2: Lint**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run lint
```

Expected: exit 0. Fix any Biome warnings before proceeding.

- [ ] **Step 3: Lint fix if needed**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run lint:fix
```

- [ ] **Step 4: Commit lint fixes (only if Step 2 produced warnings)**

```bash
git add src/server/adapters/
git commit -m "adapter: fix biome lint warnings in adapter layer"
```

---

### Task 9: Write eval harness upgrade tests (RED)

**Files:** `src/engine/eval/__tests__/run-mode.test.ts`

<!-- TODO: confirm with user — does a __tests__ folder already exist under eval/? Plan 02 file structure does not show one. Creating it here is within the allowed `src/engine/eval/**` path. -->

Write tests for the new `--mode=real|fake` flag before modifying `run.ts`.

- [ ] **Step 1: Create eval test directory**

```bash
mkdir -p /Users/ravishah/Documents/whattoeat/src/engine/eval/__tests__
```

- [ ] **Step 2: Write `run-mode.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';

/**
 * These tests verify that run.ts correctly parses the --mode flag and
 * skips real-mode runs when GEMINI_API_KEY is absent. They import only
 * the parsing/config helpers, NOT the side-effectful runEval() function.
 */
import { parseMode, shouldSkipReal } from '@/engine/eval/run';

describe('parseMode', () => {
  it('defaults to "fake" when no --mode flag is present', () => {
    expect(parseMode([])).toBe('fake');
  });

  it('returns "fake" when --mode=fake', () => {
    expect(parseMode(['--mode=fake'])).toBe('fake');
  });

  it('returns "real" when --mode=real', () => {
    expect(parseMode(['--mode=real'])).toBe('real');
  });

  it('throws on an unrecognised mode value', () => {
    expect(() => parseMode(['--mode=turbo'])).toThrow(/Invalid mode/i);
  });
});

describe('shouldSkipReal', () => {
  it('returns false when GEMINI_API_KEY is set', () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    expect(shouldSkipReal()).toBe(false);
    vi.unstubAllEnvs();
  });

  it('returns true when GEMINI_API_KEY is not set', () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    expect(shouldSkipReal()).toBe(true);
    vi.unstubAllEnvs();
  });
});
```

- [ ] **Step 3: Run tests — expected RED**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/engine/eval/__tests__/run-mode.test.ts
```

Expected: fails with cannot find exports `parseMode` / `shouldSkipReal` from `@/engine/eval/run`.

- [ ] **Step 4: Commit**

```bash
git add src/engine/eval/__tests__/run-mode.test.ts
git commit -m "eval: run-mode flag unit tests (RED)"
```

---

### Task 10: Upgrade eval harness `run.ts` (GREEN)

**Files:** `src/engine/eval/run.ts`

Add `parseMode()` and `shouldSkipReal()` as named exports, and branch the main `runEval()` body on the resolved mode. In `real` mode, instantiate `GeminiLlmClient`; in `fake` mode, use the existing `FakeLlmClient`. When `real` is requested but `GEMINI_API_KEY` is missing, print a clear skip message and exit 0 (CI-safe).

<!-- TODO: confirm with user — should real-mode output be written to a cost table file (e.g. eval-results.json) for CI to pick up, or just stdout? Treating as stdout-only for now per minimal-viable eval harness requirement. -->

- [ ] **Step 1: Read existing `run.ts` to understand current shape**

Read `/Users/ravishah/Documents/whattoeat/src/engine/eval/run.ts` and note the existing import paths and CLI arg parsing pattern.

- [ ] **Step 2: Add `parseMode` + `shouldSkipReal` exports and mode branch**

The diff should preserve all existing behaviour when `--mode=fake` (the default), and only introduce new code paths for `--mode=real`. The two new exports must be named exports so the test file can import them.

Patch `run.ts` to add at the top of the file (before the main `runEval` call):

```ts
// ---------------------------------------------------------------------------
// Mode helpers — exported for unit testing
// ---------------------------------------------------------------------------

export type EvalMode = 'fake' | 'real';

export function parseMode(argv: string[]): EvalMode {
  const flag = argv.find((a) => a.startsWith('--mode='));
  if (!flag) return 'fake';
  const value = flag.slice('--mode='.length);
  if (value !== 'fake' && value !== 'real') {
    throw new Error(`Invalid mode: "${value}". Expected "fake" or "real".`);
  }
  return value;
}

export function shouldSkipReal(): boolean {
  return !process.env['GEMINI_API_KEY'];
}
```

And update the main entry-point block at the bottom of the file to:

```ts
// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const mode = parseMode(process.argv.slice(2));

if (mode === 'real') {
  if (shouldSkipReal()) {
    console.warn(
      '[eval] Skipping real-mode eval: GEMINI_API_KEY is not set. ' +
        'Set it in .env.local and re-run with --mode=real.',
    );
    process.exit(0);
  }
  // Dynamically import to avoid loading the Gemini SDK in fake-mode CI runs.
  const { GeminiLlmClient } = await import('@/server/adapters/gemini-llm');
  await runEval(new GeminiLlmClient(), { mode: 'real' });
} else {
  // Default: fake mode — backwards-compatible with CI.
  const { FakeLlmClient } = await import('@/engine/__fixtures__/llm-fakes');
  await runEval(new FakeLlmClient(), { mode: 'fake' });
}
```

Ensure `runEval` signature accepts `opts: { mode: EvalMode }` and passes it through to the harness for logging.

- [ ] **Step 3: Run eval mode tests — expected GREEN**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/engine/eval/__tests__/run-mode.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 4: Purity gate — must still pass**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/engine/_purity.test.ts
```

Expected: GREEN. The dynamic import of `GeminiLlmClient` is inside `src/engine/eval/run.ts` which is an eval script, not a pure engine module. Verify the purity test only checks `src/engine/*.ts` source files (not `eval/`).

> If the purity gate FAILS because `run.ts` now imports from `@/server/adapters/`, check whether `src/engine/_purity.test.ts` excludes the `eval/` subdirectory. If not, add an inline comment to `run.ts` explaining the exemption and report this as a spec ambiguity to be resolved with the user.

- [ ] **Step 5: Verify fake-mode eval still exits 0**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run engine:eval
```

Expected: exits 0; prints eval table; no GEMINI_API_KEY required.

- [ ] **Step 6: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/engine/eval/run.ts src/engine/eval/__tests__/run-mode.test.ts
git commit -m "eval: add --mode=real|fake flag; GeminiLlmClient in real mode, FakeLlmClient default"
```

---

### Task 11: Full test suite + integration verification

**Files:** (no changes — verification only)

Run the complete test suite to confirm no regressions across all tracks.

- [ ] **Step 1: Full test suite**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test
```

Expected: all tests pass. At minimum expect:
- `src/engine/_purity.test.ts` — GREEN
- `src/engine/__tests__/**` (engine core, from Track 2) — GREEN
- `src/server/adapters/__tests__/lru-cache.test.ts` — GREEN (7 tests)
- `src/server/adapters/__tests__/gemini-llm.test.ts` — GREEN (~12 tests)
- `src/engine/eval/__tests__/run-mode.test.ts` — GREEN (5 tests)

- [ ] **Step 2: Full typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Full lint**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run lint
```

Expected: exit 0.

- [ ] **Step 4: Fake-mode eval (final sanity)**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run engine:eval
```

Expected: prints eval table, exits 0, no real network calls.

- [ ] **Step 5: Verify owned paths only**

```bash
git diff --name-only origin/main
```

Expected output must only include files from the allowed list:

```
bun.lock
package.json
.env.example
src/server/adapters/gemini-llm.ts
src/server/adapters/lru-cache.ts
src/server/adapters/__tests__/gemini-llm.test.ts
src/server/adapters/__tests__/lru-cache.test.ts
src/engine/eval/run.ts
src/engine/eval/__tests__/run-mode.test.ts
```

If any file outside this list appears, stop and investigate before pushing.

---

### Task 12: Open pull request

**Files:** (no new files — PR only)

- [ ] **Step 1: Push branch**

```bash
git push -u origin wt/track-3-gemini-adapter
```

- [ ] **Step 2: Create PR**

```bash
gh pr create \
  --title "Track 3: Gemini adapter + eval harness --mode=real|fake" \
  --base main \
  --body "$(cat <<'EOF'
## Summary

- Adds `GeminiLlmClient` at `src/server/adapters/gemini-llm.ts` implementing the frozen `LlmClient` port.
- Model routing: `modelHint='cheap'` → `gemini-1.5-flash`, `modelHint='strong'` → `gemini-1.5-pro`; overridable via `GEMINI_MODEL_CHEAP` / `GEMINI_MODEL_QUALITY` env vars.
- In-memory 50-slot LRU cache (`src/server/adapters/lru-cache.ts`) keyed on `cacheKey` — avoids duplicate SDK calls within a single `recommend()` invocation.
- Error mapping: timeout → `GeminiTimeoutError` (`isTimeout=true`), schema fail → `GeminiSchemaError` (contains 'Schema validation'), safety block → `GeminiRefusalError` (contains 'refusal') — aligns with engine error mapping in `src/engine/errors.ts`.
- One retry on schema-validation failure with the Zod error appended to the user prompt.
- Upgrades `src/engine/eval/run.ts` with `--mode=real|fake` flag. Default `fake` is CI-safe (no API key needed). `--mode=real` instantiates `GeminiLlmClient`; skips gracefully if `GEMINI_API_KEY` is absent.
- All SDK calls are mocked in tests — no real API calls in CI.

## Test plan

- [ ] `bun run test` — all tests pass (LRU, gemini-llm, run-mode, engine core, purity gate)
- [ ] `bun run typecheck` — exit 0
- [ ] `bun run lint` — exit 0
- [ ] `bun run engine:eval` — fake-mode eval exits 0
- [ ] `git diff --name-only origin/main` — only owned paths

## Definition of Done

- [ ] `GeminiLlmClient` implements `LlmClient` interface without modification
- [ ] All adapter tests pass with mocked SDK (no real Gemini calls in CI)
- [ ] `--mode=fake` eval is backwards-compatible (no env needed)
- [ ] `--mode=real` skips gracefully without `GEMINI_API_KEY`
- [ ] No files modified outside the owned-paths list
- [ ] Typecheck, lint, and full test suite green
- [ ] engine purity gate still GREEN
EOF
)"
```

- [ ] **Step 3: Note PR URL for the kanban card**

Copy the URL printed by `gh pr create` and paste it into the Track 3 kanban card's PR field.

---

## Definition of Done

- [ ] `src/server/adapters/gemini-llm.ts` compiles, passes all 12+ unit tests (mocked SDK), and implements `LlmClient` without any changes to `src/engine/ports/llm.ts`.
- [ ] `src/server/adapters/lru-cache.ts` passes all 7 LRU tests.
- [ ] `src/engine/eval/run.ts` accepts `--mode=real|fake`; fake is backwards-compatible; real skips gracefully without `GEMINI_API_KEY`.
- [ ] `bun run test` — full suite green (all tracks).
- [ ] `bun run typecheck` — exit 0.
- [ ] `bun run lint` — exit 0.
- [ ] `bun run engine:eval` (fake mode) — exits 0, no network.
- [ ] `src/engine/_purity.test.ts` — still GREEN.
- [ ] `git diff --name-only origin/main` — only owned paths.
- [ ] PR open and linked on kanban card.

---

## Hand-off Notes

**Plan 08 (Feed Me)** consumes `GeminiLlmClient` via `src/server/recommendation/`. The instantiation pattern will be:

```ts
import { GeminiLlmClient } from '@/server/adapters/gemini-llm';

const llm = new GeminiLlmClient(); // reads GEMINI_API_KEY + model env vars at construction
const result = await recommend(ctx, { llm, logger: pinoLogger });
```

No changes to `src/engine/` are required for that integration. The engine sees only the `LlmClient` port.

**Eval harness real-mode** (`bun run engine:eval -- --mode=real`) is intended to be run manually on a development machine with a valid `GEMINI_API_KEY` before promoting a new model configuration to production. It is **not** wired into CI automatically — add it to `engine-eval.yml` only after confirming cost bounds with the user.

<!-- TODO: confirm with user — should the GitHub Actions `engine-eval.yml` workflow run `--mode=real` on PRs touching adapter files (gated on a repo secret), or always `--mode=fake`? Treating as fake-only in CI for now to avoid surprise API charges. -->

**Spec ambiguities logged in this plan:**
1. `NEXT_PUBLIC_GEMINI_API_KEY` removal (Task 2) — confirm server-only is correct.
2. Schema-validation retry is adapter-side (Task 6) — confirm vs. engine-side retry in spec §7.
3. Real-mode eval in CI (Hand-off) — confirm whether to wire `GEMINI_API_KEY` as a repo secret.
4. Purity gate scope (Task 10) — confirm whether `src/engine/eval/` is excluded from the purity check.
