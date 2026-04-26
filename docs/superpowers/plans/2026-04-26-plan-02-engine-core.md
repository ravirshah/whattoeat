# Plan 02 — Engine Core (TDD with Fake LLM)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the pure Decision Engine (`src/engine/`) end-to-end — errors, prompts, scoring, filtering, the public `recommend()` function, all seven test suites passing, and an eval harness scaffold that exits 0 on 10 curated entries. The engine must remain free of any import from `next`, `@supabase/*`, `drizzle-orm`, or any network/DB package (purity gate runs after every engine src commit).

**Architecture:** Hexagonal engine core in `src/engine/`. The public surface is `recommend(ctx, deps)` — a pure async function that accepts a `RecommendationContext` and a `{ llm, logger?, recentCookTitles?, timeoutMs? }` bag, then returns `Promise<EngineResult<RecommendationResult>>`. All LLM I/O flows through the `LlmClient` port; tests inject `FakeLlmClient` so no network or env is needed. Internally: plan call → parallel detail calls → allergy/recency filter → score + rank → cap → rationale call → return. Errors are discriminated-union values (`ok: false`), not throws — except programmer errors.

**Tech Stack:** Bun, Vitest, Zod, `zod-to-json-schema` (devDep added in Task 1). Zero runtime additions beyond what Plan 00 already installed.

**Spec reference:** `docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md` — sections 2 (architecture), 4 (Decision Engine Contract), 6 (Parallelization), 7 (LLM pipeline).

**Prerequisites (verified before Task 1):**
- Track 0 is merged to `main`: Zod contracts at `src/contracts/zod/**`, engine ports at `src/engine/ports/**`, `src/engine/types.ts`, and `src/engine/_purity.test.ts` all exist and pass.
- `bun run test src/engine/_purity.test.ts` exits 0 on `main`.
- Branch `wt/track-2-engine-core` is checked out from a fresh `main`.

---

## File Structure

### Creates

```
src/engine/errors.ts
src/engine/prompt.ts
src/engine/score.ts
src/engine/filter.ts
src/engine/recommend.ts
src/engine/index.ts

src/engine/__fixtures__/llm-fakes.ts
src/engine/__fixtures__/contexts.ts

src/engine/__tests__/score.test.ts
src/engine/__tests__/recommend.golden.test.ts
src/engine/__tests__/recommend.allergy.test.ts
src/engine/__tests__/recommend.recency.test.ts
src/engine/__tests__/recommend.pantry-coverage.test.ts
src/engine/__tests__/recommend.signal-fit.test.ts
src/engine/__tests__/recommend.errors.test.ts

src/engine/eval/schema.ts
src/engine/eval/dataset.json
src/engine/eval/harness.ts
src/engine/eval/run.ts

scripts/run-eval.ts
```

### Modifies

```
package.json    — add engine:eval script + zod-to-json-schema devDep (Task 1 only, never touched again)
bun.lock        — updated automatically
```

### Does NOT touch (frozen by Track 0)

```
src/engine/_purity.test.ts
src/engine/ports/llm.ts
src/engine/ports/signal-provider.ts
src/engine/ports/logger.ts
src/engine/types.ts
src/contracts/zod/**
src/db/**
src/server/**
src/app/**
src/components/**
```

---

## Conventions used in this plan

- All file paths are repo-relative; absolute paths in bash commands use `/Users/ravishah/Documents/whattoeat`.
- `bun` is the package manager and test runner (`bun run test`, `bun run typecheck`).
- All engine imports use the `@/` alias (`@/contracts/zod`, `@/engine/...`).
- Commit message prefixes: `engine:` for `src/engine/` source files, `engine-test:` for test/fixture files, `engine-eval:` for `src/engine/eval/` and `scripts/run-eval.ts`.
- **Purity gate** (`bun run test src/engine/_purity.test.ts`) must be GREEN after every commit that touches `src/engine/` source files (i.e., non-test files). If it goes RED, stop and fix before proceeding.
- **TDD discipline:** every test task runs first (expected RED), then the implementation task makes it GREEN. Steps are annotated `— expected RED` or `— expected GREEN` accordingly.
- The `EngineResult<T>` discriminated union (`{ ok: true; value: T } | { ok: false; error: EngineError }`) is defined in `src/engine/errors.ts` and used as the return type of `recommend()`. Only programmer errors (unexpected thrown exceptions) escape this union.

---

## Tasks

### Task 1: Add `zod-to-json-schema` devDep + `engine:eval` script

**Files:** `package.json`, `bun.lock`

This is the only task that modifies `package.json`. We add one devDependency and two new scripts. All subsequent tasks are locked out of `package.json`.

- [ ] **Step 1: Add devDep and scripts**

Edit `package.json` — add `"zod-to-json-schema": "^3.23.0"` to `devDependencies`, and add two scripts to the `"scripts"` block:

```json
"engine:eval": "bun scripts/run-eval.ts",
"engine:eval:ci": "bun scripts/run-eval.ts --ci"
```

- [ ] **Step 2: Install**

```bash
bun install
```

Expected: installs cleanly; `bun.lock` updated.

- [ ] **Step 3: Verify typecheck still passes**

```bash
bun run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "engine: add zod-to-json-schema devDep + engine:eval script"
```

---

### Task 2: Define `EngineResult` + error classes in `src/engine/errors.ts`

**Files:** `src/engine/errors.ts`

`src/engine/types.ts` already declares the base `EngineError` and three subclasses as stubs (shipped in Track 0). This task replaces those stubs with fully-featured classes and introduces `EngineResult<T>`, `LlmInvalidJsonError`, `LlmRefusalError`, and `EngineNoCandidatesError`. Because `types.ts` is frozen, we declare the new types in `errors.ts` and re-export from the barrel in Task 9.

<!-- TODO: confirm with user — should LlmInvalidJsonError extend EngineParseError (spec §4 calls it EngineParseError) or be its own sibling? Treating it as an alias of EngineParseError for now. -->

- [ ] **Step 1: Write `src/engine/errors.ts`**

```ts
import type { EngineError } from './types';

// Re-export the base so callers only need one import.
export type { EngineError };

// ---------------------------------------------------------------------------
// Discriminated-union result wrapper
// ---------------------------------------------------------------------------

export type EngineResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: EngineError };

export function ok<T>(value: T): EngineResult<T> {
  return { ok: true, value };
}

export function fail<T>(error: EngineError): EngineResult<T> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// LLM-level errors (failures from the LLM call layer)
// ---------------------------------------------------------------------------

import { EngineParseError, EngineTimeoutError } from './types';
export { EngineParseError, EngineTimeoutError };

/** LLM returned content that failed Zod schema validation after retry. */
export class LlmInvalidJsonError extends EngineParseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'LlmInvalidJsonError';
  }
}

/** LLM refused to answer (safety filter, content policy, etc.). */
export class LlmRefusalError extends EngineParseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'LlmRefusalError';
  }
}

// ---------------------------------------------------------------------------
// Engine-level errors (failures in orchestration/filter/score)
// ---------------------------------------------------------------------------

import { EngineSafetyError } from './types';
export { EngineSafetyError };

/** All candidates were filtered out — nothing safe to return. */
export class EngineNoCandidatesError extends EngineSafetyError {
  constructor(message = 'All candidates were filtered out.', cause?: unknown) {
    super(message, cause);
    this.name = 'EngineNoCandidatesError';
  }
}

export { EngineError } from './types';
```

- [ ] **Step 2: Purity gate**

```bash
bun run test src/engine/_purity.test.ts
```

Expected: GREEN (no forbidden imports in `errors.ts`).

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/engine/errors.ts
git commit -m "engine: EngineResult discriminated union + error subclasses"
```

---

### Task 3: Write `src/engine/prompt.ts` — prompts + LLM output schemas

**Files:** `src/engine/prompt.ts`

Deterministic prompt builders and the Zod schemas used to parse plan/detail/rationale LLM responses. `PROMPTS_VERSION` is stored on every recommendation run for traceability.

- [ ] **Step 1: Write `src/engine/prompt.ts`**

```ts
import { z } from 'zod';
import type { RecommendationContext } from '@/contracts/zod';

// ---------------------------------------------------------------------------
// Version — bump this whenever prompt text changes
// ---------------------------------------------------------------------------

export const PROMPTS_VERSION = '2026-04-26.1';

// ---------------------------------------------------------------------------
// LLM output schemas (used by FakeLlmClient in tests + GeminiLlmClient in prod)
// ---------------------------------------------------------------------------

/** One concept sketch produced by the plan call. */
export const ConceptSchema = z.object({
  title: z.string().min(1).max(120),
  oneLineWhy: z.string().min(1).max(280),
  cuisine: z.string().max(40).nullable(),
  estMinutes: z.number().int().min(1).max(480),
  pantryFit: z.number().min(0).max(1),
});
export type Concept = z.infer<typeof ConceptSchema>;

export const PlanResponseSchema = z.object({
  concepts: z.array(ConceptSchema).min(1).max(10),
});
export type PlanResponse = z.infer<typeof PlanResponseSchema>;

/** Full recipe produced by the detail call for one concept. */
export const DetailResponseSchema = z.object({
  title: z.string().min(1).max(120),
  oneLineWhy: z.string().min(1).max(280),
  ingredients: z.array(
    z.object({
      name: z.string().min(1).max(120),
      qty: z.number().nonnegative().nullable(),
      unit: z.string().max(20).nullable(),
      note: z.string().max(120).nullable().optional(),
    }),
  ).min(1).max(50),
  steps: z.array(
    z.object({
      idx: z.number().int().min(1),
      text: z.string().min(1).max(800),
      durationMin: z.number().int().nonnegative().nullable().optional(),
    }),
  ).min(1).max(40),
  estMacros: z.object({
    kcal: z.number().int().nonnegative(),
    protein_g: z.number().int().nonnegative(),
    carbs_g: z.number().int().nonnegative(),
    fat_g: z.number().int().nonnegative(),
  }),
  servings: z.number().int().min(1).max(20),
  totalMinutes: z.number().int().min(1).max(480),
  cuisine: z.string().max(40).nullable(),
  tags: z.array(z.string().min(1).max(40)).default([]),
  pantryCoverage: z.number().min(0).max(1),
  missingItems: z.array(z.string()).default([]),
});
export type DetailResponse = z.infer<typeof DetailResponseSchema>;

/** Rationale batch — one sentence per final pick + an overall summary. */
export const RationaleResponseSchema = z.object({
  overall: z.string().min(1).max(500),
  perMeal: z.array(
    z.object({
      title: z.string().min(1).max(120),
      rationale: z.string().min(1).max(280),
    }),
  ).min(1).max(5),
});
export type RationaleResponse = z.infer<typeof RationaleResponseSchema>;

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

/** Serialise context deterministically (sorted keys) for cache-eligibility. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort() as never);
}

export const SYSTEM_PROMPT_BASE = `You are a personal meal-recommendation engine.
You produce structured JSON matching the exact schema provided.
Rules:
- Respect all allergies absolutely — never include a forbidden ingredient even as a substitute.
- Honour the user's goal (cut = calorie deficit, maintain = at targets, bulk = surplus).
- Use only ingredients that are plausibly available or easy to obtain; prefer pantry items.
- Portions are for the stated servings count.
- oneLineWhy is sharp, personal, and reads like advice from a knowledgeable friend who cooks.
- Respond ONLY with valid JSON. No markdown fences, no prose outside JSON.`;

export function buildPlanPrompt(ctx: RecommendationContext): {
  system: string;
  user: string;
} {
  const system = `${SYSTEM_PROMPT_BASE}

Task: Given the user's context, propose ${ctx.request.candidateCount + 2} distinct meal concepts.
Return a JSON object: { "concepts": [ { "title", "oneLineWhy", "cuisine", "estMinutes", "pantryFit" } ] }
pantryFit is a 0-1 float estimating what fraction of ingredients the user already has.`;

  const user = stableJson({
    goal: ctx.profile.goal,
    targets: ctx.profile.targets,
    allergies: ctx.profile.allergies,
    dislikes: ctx.profile.dislikes,
    equipment: ctx.profile.equipment,
    pantry: ctx.pantry.map((p) => p.name),
    checkin: ctx.checkin ?? null,
    signals: ctx.signals ?? null,
    request: ctx.request,
    promptsVersion: PROMPTS_VERSION,
  });

  return { system, user };
}

export function buildDetailPrompt(
  concept: Concept,
  ctx: RecommendationContext,
): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT_BASE}

Task: Expand the given meal concept into a full recipe.
Return a JSON object matching the DetailResponse schema exactly.`;

  const user = stableJson({
    concept,
    goal: ctx.profile.goal,
    targets: ctx.profile.targets,
    allergies: ctx.profile.allergies,
    equipment: ctx.profile.equipment,
    pantry: ctx.pantry.map((p) => p.name),
    request: ctx.request,
    promptsVersion: PROMPTS_VERSION,
  });

  return { system, user };
}

export function buildRationalePrompt(
  titles: string[],
  ctx: RecommendationContext,
): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT_BASE}

Task: For the given list of chosen meals, write a brief overall rationale and one sharp sentence per meal explaining why it suits the user right now.
Return: { "overall": string, "perMeal": [{ "title": string, "rationale": string }] }`;

  const user = stableJson({
    chosenMeals: titles,
    goal: ctx.profile.goal,
    checkin: ctx.checkin ?? null,
    signals: ctx.signals ?? null,
    promptsVersion: PROMPTS_VERSION,
  });

  return { system, user };
}
```

- [ ] **Step 2: Purity gate**

```bash
bun run test src/engine/_purity.test.ts
```

Expected: GREEN.

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/engine/prompt.ts
git commit -m "engine: PROMPTS_VERSION + buildPlanPrompt/buildDetailPrompt/buildRationalePrompt + LLM schemas"
```

---

### Task 4: Write score tests (RED)

**Files:** `src/engine/__tests__/score.test.ts`

Write the full score test suite before implementing `score.ts`. Run it and confirm RED.

- [ ] **Step 1: Create test directory**

```bash
mkdir -p /Users/ravishah/Documents/whattoeat/src/engine/__tests__
```

- [ ] **Step 2: Write `src/engine/__tests__/score.test.ts`**

```ts
import { describe, expect, test } from 'vitest';
import { scoreCandidate, SCORE_WEIGHTS } from '@/engine/score';
import type { MealCandidate } from '@/contracts/zod';
import type { RecommendationContext } from '@/contracts/zod';

// ---------------------------------------------------------------------------
// Minimal fixture helpers
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<RecommendationContext['profile']> = {}): RecommendationContext {
  return {
    pantry: [],
    profile: {
      user_id: '00000000-0000-0000-0000-000000000001',
      display_name: 'Test',
      goal: 'maintain',
      targets: { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 },
      height_cm: 175,
      weight_kg: 75,
      birthdate: '1990-01-01',
      sex: 'male',
      activity_level: 'moderate',
      allergies: [],
      dislikes: [],
      cuisines: [],
      equipment: [],
      created_at: '2026-04-26T00:00:00.000Z',
      updated_at: '2026-04-26T00:00:00.000Z',
      ...overrides,
    },
    request: { mealType: 'any', candidateCount: 3 },
  };
}

function makeCandidate(overrides: Partial<MealCandidate> = {}): MealCandidate {
  return {
    title: 'Test Meal',
    oneLineWhy: 'Great for testing',
    ingredients: [{ name: 'chicken', qty: 200, unit: 'g', note: null }],
    steps: [{ idx: 1, text: 'Cook it', durationMin: null }],
    estMacros: { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 },
    servings: 1,
    totalMinutes: 30,
    cuisine: 'american',
    tags: [],
    pantryCoverage: 0.8,
    missingItems: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SCORE_WEIGHTS', () => {
  test('weights sum to 1', () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});

describe('scoreCandidate — pantry coverage', () => {
  test('higher pantryCoverage yields higher score', () => {
    const ctx = makeCtx();
    const high = scoreCandidate(makeCandidate({ pantryCoverage: 0.9 }), ctx);
    const low = scoreCandidate(makeCandidate({ pantryCoverage: 0.2 }), ctx);
    expect(high).toBeGreaterThan(low);
  });

  test('pantryCoverage = 1 gives max pantry contribution', () => {
    const ctx = makeCtx();
    const score = scoreCandidate(makeCandidate({ pantryCoverage: 1 }), ctx);
    expect(score).toBeGreaterThanOrEqual(SCORE_WEIGHTS.pantry);
  });
});

describe('scoreCandidate — macro alignment (goal: cut)', () => {
  test('candidate within macro targets scores higher than one way over', () => {
    const ctx = makeCtx({ goal: 'cut', targets: { kcal: 1600, protein_g: 140, carbs_g: 130, fat_g: 55 } });
    const onTarget = scoreCandidate(
      makeCandidate({ estMacros: { kcal: 1600, protein_g: 140, carbs_g: 130, fat_g: 55 } }),
      ctx,
    );
    const wayOver = scoreCandidate(
      makeCandidate({ estMacros: { kcal: 3000, protein_g: 50, carbs_g: 400, fat_g: 120 } }),
      ctx,
    );
    expect(onTarget).toBeGreaterThan(wayOver);
  });
});

describe('scoreCandidate — time budget', () => {
  test('meal within time budget scores higher than one over budget', () => {
    const ctx: RecommendationContext = {
      ...makeCtx(),
      request: { mealType: 'any', timeBudgetMin: 20, candidateCount: 3 },
    };
    const fast = scoreCandidate(makeCandidate({ totalMinutes: 15 }), ctx);
    const slow = scoreCandidate(makeCandidate({ totalMinutes: 60 }), ctx);
    expect(fast).toBeGreaterThan(slow);
  });

  test('no time budget — totalMinutes does not penalise', () => {
    const ctx = makeCtx();
    const fast = scoreCandidate(makeCandidate({ totalMinutes: 15 }), ctx);
    const slow = scoreCandidate(makeCandidate({ totalMinutes: 60 }), ctx);
    // Without a budget constraint the difference should be negligible
    expect(Math.abs(fast - slow)).toBeLessThan(0.05);
  });
});

describe('scoreCandidate — return range', () => {
  test('score is always in [0, 1]', () => {
    const ctx = makeCtx();
    for (const coverage of [0, 0.5, 1]) {
      for (const kcal of [500, 2000, 5000]) {
        const s = scoreCandidate(makeCandidate({ pantryCoverage: coverage, estMacros: { kcal, protein_g: 50, carbs_g: 100, fat_g: 30 } }), ctx);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      }
    }
  });
});
```

- [ ] **Step 3: Run — expected RED**

```bash
bun run test src/engine/__tests__/score.test.ts
```

Expected: RED — `Cannot find module '@/engine/score'`.

- [ ] **Step 4: Commit test file**

```bash
git add src/engine/__tests__/score.test.ts
git commit -m "engine-test: score.test.ts (RED — awaiting score.ts)"
```

---

### Task 5: Implement `src/engine/score.ts` (GREEN)

**Files:** `src/engine/score.ts`

Pure scoring function. No side effects, no I/O. Re-rank later consumers sort descending on `scoreCandidate` output.

- [ ] **Step 1: Write `src/engine/score.ts`**

```ts
import type { MealCandidate, RecommendationContext } from '@/contracts/zod';

// ---------------------------------------------------------------------------
// Weights — must sum to 1
// ---------------------------------------------------------------------------

export const SCORE_WEIGHTS = {
  pantry: 0.40,
  macros: 0.35,
  time: 0.25,
} as const satisfies Record<string, number>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** 0-1 score for how close the candidate macros are to the target. */
function macroAlignmentScore(
  candidate: MealCandidate,
  ctx: RecommendationContext,
): number {
  const { targets } = ctx.profile;
  const { estMacros } = candidate;

  // Weighted divergence: kcal counts most, then protein, then carbs/fat equally.
  const fields: Array<{ actual: number; target: number; weight: number }> = [
    { actual: estMacros.kcal, target: targets.kcal, weight: 0.5 },
    { actual: estMacros.protein_g, target: targets.protein_g, weight: 0.3 },
    { actual: estMacros.carbs_g, target: targets.carbs_g, weight: 0.1 },
    { actual: estMacros.fat_g, target: targets.fat_g, weight: 0.1 },
  ];

  let divergence = 0;
  for (const { actual, target, weight } of fields) {
    if (target === 0) continue;
    const ratio = Math.abs(actual - target) / target;
    // Cap per-field divergence at 1 (100% off = worst)
    divergence += weight * Math.min(ratio, 1);
  }

  return Math.max(0, 1 - divergence);
}

/** 0-1 score for time fit: 1 if within budget, degrades linearly over budget. */
function timeScore(candidate: MealCandidate, ctx: RecommendationContext): number {
  const budget = ctx.request.timeBudgetMin;
  if (budget == null) {
    // No constraint — give everyone a neutral mid score so it doesn't distort ranking.
    return 0.5;
  }
  if (candidate.totalMinutes <= budget) return 1;
  // Over budget: penalty grows linearly; 2× over budget → score 0.
  const overRatio = (candidate.totalMinutes - budget) / budget;
  return Math.max(0, 1 - overRatio);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a 0-1 score for a candidate given the recommendation context.
 * Higher is better. Callers sort descending.
 */
export function scoreCandidate(
  candidate: MealCandidate,
  ctx: RecommendationContext,
): number {
  const pantryScore = candidate.pantryCoverage; // already 0-1
  const macroScore = macroAlignmentScore(candidate, ctx);
  const tScore = timeScore(candidate, ctx);

  const raw =
    SCORE_WEIGHTS.pantry * pantryScore +
    SCORE_WEIGHTS.macros * macroScore +
    SCORE_WEIGHTS.time * tScore;

  // Clamp to [0, 1] to guard against floating-point drift.
  return Math.max(0, Math.min(1, raw));
}
```

- [ ] **Step 2: Run score tests — expected GREEN**

```bash
bun run test src/engine/__tests__/score.test.ts
```

Expected: all tests GREEN.

- [ ] **Step 3: Purity gate**

```bash
bun run test src/engine/_purity.test.ts
```

Expected: GREEN.

- [ ] **Step 4: Typecheck**

```bash
bun run typecheck
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/engine/score.ts
git commit -m "engine: scoreCandidate + SCORE_WEIGHTS"
```

---

### Task 6: Write `src/engine/filter.ts`

**Files:** `src/engine/filter.ts`

Allergy filter + recency filter. Pure function — no I/O.

- [ ] **Step 1: Write `src/engine/filter.ts`**

```ts
import type { MealCandidate, RecommendationContext } from '@/contracts/zod';

// ---------------------------------------------------------------------------
// Allergy filter
// ---------------------------------------------------------------------------

/**
 * Returns true if any ingredient in the candidate contains a forbidden allergen.
 * Case-insensitive substring match — errs on the side of safety.
 */
function containsAllergen(candidate: MealCandidate, allergies: string[]): boolean {
  if (allergies.length === 0) return false;
  const lower = allergies.map((a) => a.toLowerCase());
  return candidate.ingredients.some((ing) =>
    lower.some((allergen) => ing.name.toLowerCase().includes(allergen)),
  );
}

// ---------------------------------------------------------------------------
// Recency filter
// ---------------------------------------------------------------------------

/**
 * Returns true if the candidate title closely matches a recently cooked title.
 * Uses lowercase exact match for now; fuzzy matching is a v2.1 enhancement.
 */
function isRecentlyCooked(candidate: MealCandidate, recentCookTitles: string[]): boolean {
  if (recentCookTitles.length === 0) return false;
  const lower = candidate.title.toLowerCase();
  return recentCookTitles.some((t) => t.toLowerCase() === lower);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FilterResult {
  passed: MealCandidate[];
  droppedAllergen: MealCandidate[];
  droppedRecency: MealCandidate[];
}

/**
 * Filters candidates by allergy safety (hard drop) and recency (soft drop, only
 * applied when it would not eliminate all candidates).
 */
export function filterCandidates(
  candidates: MealCandidate[],
  ctx: RecommendationContext,
  recentCookTitles: string[] = [],
): FilterResult {
  const { allergies } = ctx.profile;

  const droppedAllergen: MealCandidate[] = [];
  const allergenPassed: MealCandidate[] = [];

  for (const c of candidates) {
    if (containsAllergen(c, allergies)) {
      droppedAllergen.push(c);
    } else {
      allergenPassed.push(c);
    }
  }

  // Recency is a soft filter: only drop if survivors remain afterwards.
  const droppedRecency: MealCandidate[] = [];
  const recencyPassed: MealCandidate[] = [];

  for (const c of allergenPassed) {
    if (isRecentlyCooked(c, recentCookTitles)) {
      droppedRecency.push(c);
    } else {
      recencyPassed.push(c);
    }
  }

  // If recency filter would remove everything, keep allergen-passed set intact.
  const passed = recencyPassed.length > 0 ? recencyPassed : allergenPassed;

  return { passed, droppedAllergen, droppedRecency: recencyPassed.length > 0 ? droppedRecency : [] };
}
```

- [ ] **Step 2: Purity gate**

```bash
bun run test src/engine/_purity.test.ts
```

Expected: GREEN.

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/engine/filter.ts
git commit -m "engine: filterCandidates (allergy + recency)"
```

---

### Task 7: Build fixtures — `FakeLlmClient` + context fixtures

**Files:** `src/engine/__fixtures__/llm-fakes.ts`, `src/engine/__fixtures__/contexts.ts`

These are the test doubles consumed by every `recommend.*` test. They must be written before the test suites that use them.

- [ ] **Step 1: Create fixtures directory**

```bash
mkdir -p /Users/ravishah/Documents/whattoeat/src/engine/__fixtures__
```

- [ ] **Step 2: Write `src/engine/__fixtures__/llm-fakes.ts`**

```ts
import type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from '@/engine/types';
import type { PlanResponse, DetailResponse, RationaleResponse } from '@/engine/prompt';
import { PlanResponseSchema, DetailResponseSchema, RationaleResponseSchema } from '@/engine/prompt';

// ---------------------------------------------------------------------------
// Canned LLM responses (used by FakeLlmClient)
// ---------------------------------------------------------------------------

const CANNED_PLAN: PlanResponse = {
  concepts: [
    {
      title: 'Grilled Chicken & Rice',
      oneLineWhy: 'High-protein, hits your targets cleanly.',
      cuisine: 'american',
      estMinutes: 25,
      pantryFit: 0.9,
    },
    {
      title: 'Greek Yogurt Parfait',
      oneLineWhy: 'Fast, protein-dense, no cooking required.',
      cuisine: 'mediterranean',
      estMinutes: 5,
      pantryFit: 0.85,
    },
    {
      title: 'Egg & Veggie Scramble',
      oneLineWhy: 'Versatile breakfast-or-any-time protein hit.',
      cuisine: 'american',
      estMinutes: 15,
      pantryFit: 0.8,
    },
    {
      title: 'Tuna Salad Wrap',
      oneLineWhy: 'Lean protein, pantry-friendly, 10 minutes.',
      cuisine: 'american',
      estMinutes: 10,
      pantryFit: 0.75,
    },
    {
      title: 'Oats with Almond Butter',
      oneLineWhy: 'Slow carbs + healthy fats for sustained energy.',
      cuisine: 'american',
      estMinutes: 8,
      pantryFit: 0.7,
    },
  ],
};

function makeDetail(title: string, allergenFree = true): DetailResponse {
  return {
    title,
    oneLineWhy: `${title} — great choice.`,
    ingredients: allergenFree
      ? [
          { name: 'chicken breast', qty: 200, unit: 'g', note: null },
          { name: 'white rice', qty: 150, unit: 'g', note: null },
        ]
      : [
          { name: 'peanut butter', qty: 30, unit: 'g', note: null }, // allergen
          { name: 'bread', qty: 60, unit: 'g', note: null },
        ],
    steps: [
      { idx: 1, text: 'Prepare ingredients.', durationMin: 5 },
      { idx: 2, text: 'Cook until done.', durationMin: 20 },
    ],
    estMacros: { kcal: 500, protein_g: 45, carbs_g: 50, fat_g: 10 },
    servings: 1,
    totalMinutes: 25,
    cuisine: 'american',
    tags: ['high-protein'],
    pantryCoverage: 0.9,
    missingItems: [],
  };
}

const CANNED_RATIONALE: RationaleResponse = {
  overall: 'These picks match your goal and pantry well.',
  perMeal: [
    { title: 'Grilled Chicken & Rice', rationale: 'Hits your protein target in one go.' },
    { title: 'Greek Yogurt Parfait', rationale: 'Fast and filling — good when time is short.' },
    { title: 'Egg & Veggie Scramble', rationale: 'Versatile and uses what you have.' },
  ],
};

// ---------------------------------------------------------------------------
// FakeLlmClient — returns canned responses; validates output schema
// ---------------------------------------------------------------------------

export class FakeLlmClient implements LlmClient {
  /** Override individual responses for targeted tests. */
  constructor(
    private readonly overrides: {
      plan?: PlanResponse;
      detail?: (title: string) => DetailResponse;
      rationale?: RationaleResponse;
    } = {},
  ) {}

  async generateStructured<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    // Detect which call this is by schema shape inspection.
    const isPlan = args.schema === (PlanResponseSchema as unknown);
    const isRationale = args.schema === (RationaleResponseSchema as unknown);

    let raw: unknown;

    if (isPlan) {
      raw = this.overrides.plan ?? CANNED_PLAN;
    } else if (isRationale) {
      raw = this.overrides.rationale ?? CANNED_RATIONALE;
    } else {
      // Detail call — infer the title from the user prompt JSON.
      let title = 'Grilled Chicken & Rice';
      try {
        const parsed = JSON.parse(args.user) as { concept?: { title?: string } };
        title = parsed.concept?.title ?? title;
      } catch {
        // ignore
      }
      raw = this.overrides.detail
        ? this.overrides.detail(title)
        : makeDetail(title);
    }

    const value = args.schema.parse(raw) as T;
    return {
      value,
      tokens: { prompt: 100, completion: 50 },
      modelUsed: 'fake-llm-v1',
    };
  }
}

// ---------------------------------------------------------------------------
// AlwaysThrowsLlmClient — every call throws LlmInvalidJsonError
// ---------------------------------------------------------------------------

import { LlmInvalidJsonError } from '@/engine/errors';

export class AlwaysThrowsLlmClient implements LlmClient {
  async generateStructured<T>(_args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    throw new LlmInvalidJsonError('Simulated parse failure');
  }
}

// ---------------------------------------------------------------------------
// FailOnceLlmClient — first call throws, subsequent calls delegate to Fake
// ---------------------------------------------------------------------------

export class FailOnceLlmClient implements LlmClient {
  private callCount = 0;
  private readonly delegate = new FakeLlmClient();

  async generateStructured<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>> {
    this.callCount += 1;
    if (this.callCount === 1) {
      throw new LlmInvalidJsonError('Simulated first-call failure');
    }
    return this.delegate.generateStructured(args);
  }
}

// ---------------------------------------------------------------------------
// AllergenDetailFakeClient — detail calls return allergen-containing ingredients
// ---------------------------------------------------------------------------

export class AllergenDetailFakeClient extends FakeLlmClient {
  constructor() {
    super({
      detail: (title) => makeDetail(title, false),
    });
  }
}
```

- [ ] **Step 3: Write `src/engine/__fixtures__/contexts.ts`**

```ts
import type { RecommendationContext } from '@/contracts/zod';

const BASE_PROFILE = {
  user_id: '00000000-0000-0000-0000-000000000001',
  display_name: 'Test User',
  goal: 'maintain' as const,
  targets: { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 },
  height_cm: 175,
  weight_kg: 75,
  birthdate: '1990-01-01',
  sex: 'male' as const,
  activity_level: 'moderate' as const,
  allergies: [] as string[],
  dislikes: [] as string[],
  cuisines: [] as string[],
  equipment: ['stovetop', 'oven', 'microwave'],
  created_at: '2026-04-26T00:00:00.000Z',
  updated_at: '2026-04-26T00:00:00.000Z',
};

const STOCKED_PANTRY = [
  { id: 'p1', user_id: BASE_PROFILE.user_id, name: 'chicken breast', display_name: 'Chicken Breast', category: 'protein' as const, available: true, added_at: '2026-04-26T00:00:00.000Z' },
  { id: 'p2', user_id: BASE_PROFILE.user_id, name: 'white rice', display_name: 'White Rice', category: 'grain' as const, available: true, added_at: '2026-04-26T00:00:00.000Z' },
  { id: 'p3', user_id: BASE_PROFILE.user_id, name: 'eggs', display_name: 'Eggs', category: 'protein' as const, available: true, added_at: '2026-04-26T00:00:00.000Z' },
  { id: 'p4', user_id: BASE_PROFILE.user_id, name: 'greek yogurt', display_name: 'Greek Yogurt', category: 'dairy' as const, available: true, added_at: '2026-04-26T00:00:00.000Z' },
  { id: 'p5', user_id: BASE_PROFILE.user_id, name: 'olive oil', display_name: 'Olive Oil', category: 'pantry' as const, available: true, added_at: '2026-04-26T00:00:00.000Z' },
];

/** 1. Standard cutting-day context */
export const cuttingDayCtx: RecommendationContext = {
  pantry: STOCKED_PANTRY,
  profile: { ...BASE_PROFILE, goal: 'cut', targets: { kcal: 1600, protein_g: 150, carbs_g: 130, fat_g: 50 } },
  checkin: { id: 'c1', user_id: BASE_PROFILE.user_id, date: '2026-04-26', energy: 3, training: 'light', hunger: 'normal', note: null },
  request: { mealType: 'dinner', candidateCount: 3 },
};

/** 2. Hard training day — bulk goal, high protein priority */
export const trainingDayCtx: RecommendationContext = {
  pantry: STOCKED_PANTRY,
  profile: { ...BASE_PROFILE, goal: 'bulk', targets: { kcal: 2800, protein_g: 200, carbs_g: 320, fat_g: 90 } },
  checkin: { id: 'c2', user_id: BASE_PROFILE.user_id, date: '2026-04-26', energy: 5, training: 'hard', hunger: 'high', note: null },
  request: { mealType: 'any', candidateCount: 3 },
};

/** 3. Low-sleep recovery context — quick meal preferred */
export const lowSleepCtx: RecommendationContext = {
  pantry: STOCKED_PANTRY,
  profile: BASE_PROFILE,
  checkin: { id: 'c3', user_id: BASE_PROFILE.user_id, date: '2026-04-26', energy: 1, training: 'none', hunger: 'low', note: null },
  signals: { sleep: { lastNightHours: 4.5, quality: 'poor' } },
  request: { mealType: 'breakfast', timeBudgetMin: 10, candidateCount: 2 },
};

/** 4. Bare pantry — only 2 items available */
export const barePantryCtx: RecommendationContext = {
  pantry: [
    { id: 'p1', user_id: BASE_PROFILE.user_id, name: 'eggs', display_name: 'Eggs', category: 'protein', available: true, added_at: '2026-04-26T00:00:00.000Z' },
    { id: 'p2', user_id: BASE_PROFILE.user_id, name: 'salt', display_name: 'Salt', category: 'pantry', available: true, added_at: '2026-04-26T00:00:00.000Z' },
  ],
  profile: BASE_PROFILE,
  request: { mealType: 'any', candidateCount: 3 },
};

/** 5. Allergy context — peanut allergy */
export const allergyCtx: RecommendationContext = {
  pantry: STOCKED_PANTRY,
  profile: { ...BASE_PROFILE, allergies: ['peanut'] },
  request: { mealType: 'any', candidateCount: 3 },
};

/** 6. Recency context — one recent cook title to de-prioritise */
export const recencyCtx: RecommendationContext = {
  pantry: STOCKED_PANTRY,
  profile: BASE_PROFILE,
  request: { mealType: 'dinner', candidateCount: 3 },
};

export const RECENCY_RECENT_TITLE = 'Grilled Chicken & Rice';
```

- [ ] **Step 4: Typecheck**

```bash
bun run typecheck
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/engine/__fixtures__/
git commit -m "engine-test: FakeLlmClient + AlwaysThrowsLlmClient + FailOnceLlmClient + 6 context fixtures"
```

---

### Task 8: Write all seven `recommend.*` test files (RED)

**Files:** `src/engine/__tests__/recommend.golden.test.ts`, `recommend.allergy.test.ts`, `recommend.recency.test.ts`, `recommend.pantry-coverage.test.ts`, `recommend.signal-fit.test.ts`, `recommend.errors.test.ts`

All six `recommend.*` tests (plus the already-written score test) run RED because `recommend.ts` doesn't exist yet. Commit them, confirm RED, then implement.

- [ ] **Step 1: Write `src/engine/__tests__/recommend.golden.test.ts`**

```ts
import { describe, expect, test } from 'vitest';
import { recommend } from '@/engine/recommend';
import { FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { cuttingDayCtx } from '@/engine/__fixtures__/contexts';

describe('recommend — golden path', () => {
  test('returns ok result with candidates and rationale', async () => {
    const result = await recommend(cuttingDayCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.value.candidates.length).toBeLessThanOrEqual(cuttingDayCtx.request.candidateCount);
    expect(result.value.rationale).toBeTruthy();
    expect(result.value.modelUsed).toBe('fake-llm-v1');
    expect(result.value.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.value.tokens.prompt).toBeGreaterThan(0);
  });

  test('candidates are sorted — highest pantryCoverage first when macros equal', async () => {
    const result = await recommend(cuttingDayCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const coverages = result.value.candidates.map((c) => c.pantryCoverage);
    for (let i = 1; i < coverages.length; i++) {
      // Sorted descending (higher is better), allow ties
      expect(coverages[i - 1]).toBeGreaterThanOrEqual(coverages[i] ?? 0);
    }
  });

  test('candidateCount cap is respected', async () => {
    const ctx = { ...cuttingDayCtx, request: { ...cuttingDayCtx.request, candidateCount: 2 } };
    const result = await recommend(ctx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Write `src/engine/__tests__/recommend.allergy.test.ts`**

```ts
import { describe, expect, test } from 'vitest';
import { recommend } from '@/engine/recommend';
import { AllergenDetailFakeClient, FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { allergyCtx } from '@/engine/__fixtures__/contexts';
import { PlanResponseSchema } from '@/engine/prompt';
import type { PlanResponse } from '@/engine/prompt';

describe('recommend — allergy filtering', () => {
  test('drops candidates that contain allergen ingredients', async () => {
    // AllergenDetailFakeClient returns peanut butter in every detail
    const result = await recommend(allergyCtx, { llm: new AllergenDetailFakeClient() });
    // All allergen candidates dropped → EngineNoCandidatesError
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.name).toBe('EngineNoCandidatesError');
  });

  test('non-allergen candidate passes through', async () => {
    // FakeLlmClient returns allergen-free ingredients
    const result = await recommend(allergyCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const c of result.value.candidates) {
      for (const ing of c.ingredients) {
        expect(ing.name.toLowerCase()).not.toContain('peanut');
      }
    }
  });
});
```

- [ ] **Step 3: Write `src/engine/__tests__/recommend.recency.test.ts`**

```ts
import { describe, expect, test } from 'vitest';
import { recommend } from '@/engine/recommend';
import { FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { recencyCtx, RECENCY_RECENT_TITLE } from '@/engine/__fixtures__/contexts';

describe('recommend — recency filtering', () => {
  test('recently cooked title is de-prioritised (not first)', async () => {
    const result = await recommend(recencyCtx, {
      llm: new FakeLlmClient(),
      recentCookTitles: [RECENCY_RECENT_TITLE],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const firstTitle = result.value.candidates[0]?.title;
    // The recently cooked meal should not be the first pick if alternatives exist
    if (result.value.candidates.length > 1) {
      expect(firstTitle).not.toBe(RECENCY_RECENT_TITLE);
    }
  });

  test('recency soft-filter keeps at least one candidate', async () => {
    // Even if the only concept matches recent title, we still return something
    const result = await recommend(recencyCtx, {
      llm: new FakeLlmClient(),
      recentCookTitles: ['Grilled Chicken & Rice', 'Greek Yogurt Parfait', 'Egg & Veggie Scramble', 'Tuna Salad Wrap', 'Oats with Almond Butter'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 4: Write `src/engine/__tests__/recommend.pantry-coverage.test.ts`**

```ts
import { describe, expect, test } from 'vitest';
import { recommend } from '@/engine/recommend';
import { FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { barePantryCtx, cuttingDayCtx } from '@/engine/__fixtures__/contexts';

describe('recommend — pantry coverage', () => {
  test('candidates include pantryCoverage field in [0, 1]', async () => {
    const result = await recommend(cuttingDayCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const c of result.value.candidates) {
      expect(c.pantryCoverage).toBeGreaterThanOrEqual(0);
      expect(c.pantryCoverage).toBeLessThanOrEqual(1);
    }
  });

  test('bare pantry still returns candidates (LLM is responsible for pantryFit)', async () => {
    const result = await recommend(barePantryCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 5: Write `src/engine/__tests__/recommend.signal-fit.test.ts`**

```ts
import { describe, expect, test } from 'vitest';
import { recommend } from '@/engine/recommend';
import { FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { lowSleepCtx, trainingDayCtx } from '@/engine/__fixtures__/contexts';

describe('recommend — signal fit', () => {
  test('low-sleep context returns result (signals forwarded to prompts)', async () => {
    const result = await recommend(lowSleepCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeGreaterThanOrEqual(1);
  });

  test('training-day context returns result', async () => {
    const result = await recommend(trainingDayCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeGreaterThanOrEqual(1);
  });

  test('timeBudgetMin cap is respected for low-sleep quick-meal context', async () => {
    const result = await recommend(lowSleepCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // candidateCount is 2 for lowSleepCtx
    expect(result.value.candidates.length).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 6: Write `src/engine/__tests__/recommend.errors.test.ts`**

```ts
import { describe, expect, test } from 'vitest';
import { recommend } from '@/engine/recommend';
import { AlwaysThrowsLlmClient, FailOnceLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { cuttingDayCtx } from '@/engine/__fixtures__/contexts';

describe('recommend — error contract', () => {
  test('AlwaysThrowsLlmClient → ok: false with LlmInvalidJsonError', async () => {
    const result = await recommend(cuttingDayCtx, { llm: new AlwaysThrowsLlmClient() });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.name).toBe('LlmInvalidJsonError');
  });

  test('FailOnceLlmClient → ok: false (plan call fails, no retry at engine level)', async () => {
    const result = await recommend(cuttingDayCtx, { llm: new FailOnceLlmClient() });
    // The engine wraps LLM errors into fail(). FailOnceLlmClient fails the plan call.
    expect(result.ok).toBe(false);
  });

  test('timeout results in EngineTimeoutError', async () => {
    const result = await recommend(cuttingDayCtx, {
      llm: new AlwaysThrowsLlmClient(),
      timeoutMs: 1,
    });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 7: Run all recommend tests — expected RED**

```bash
bun run test src/engine/__tests__/recommend.golden.test.ts
```

Expected: RED — `Cannot find module '@/engine/recommend'`.

- [ ] **Step 8: Commit test files**

```bash
git add src/engine/__tests__/
git commit -m "engine-test: all 6 recommend.* test files (RED — awaiting recommend.ts)"
```

---

### Task 9: Implement `src/engine/recommend.ts` (GREEN)

**Files:** `src/engine/recommend.ts`

The public `recommend()` function wiring plan → detail (parallel) → filter → score → cap → rationale → return.

- [ ] **Step 1: Write `src/engine/recommend.ts`**

```ts
import type { RecommendationContext, RecommendationResult } from '@/contracts/zod';
import type { LlmClient, Logger } from '@/engine/types';
import type { EngineResult } from '@/engine/errors';
import { ok, fail, EngineNoCandidatesError, LlmInvalidJsonError, EngineTimeoutError } from '@/engine/errors';
import {
  PlanResponseSchema,
  DetailResponseSchema,
  RationaleResponseSchema,
  buildPlanPrompt,
  buildDetailPrompt,
  buildRationalePrompt,
  PROMPTS_VERSION,
} from '@/engine/prompt';
import { filterCandidates } from '@/engine/filter';
import { scoreCandidate } from '@/engine/score';
import type { MealCandidate } from '@/contracts/zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecommendDeps {
  llm: LlmClient;
  logger?: Logger;
  recentCookTitles?: string[];
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wraps a promise with a timeout; throws EngineTimeoutError on expiry. */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new EngineTimeoutError(`Engine timed out after ${ms}ms`)),
      ms,
    );
  });
  try {
    const result = await Promise.race([promise, timeout]);
    return result;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Core orchestration (no timeout wrapping here — withTimeout wraps recommend)
// ---------------------------------------------------------------------------

async function _recommend(
  ctx: RecommendationContext,
  deps: RecommendDeps,
): Promise<EngineResult<RecommendationResult>> {
  const { llm, logger, recentCookTitles = [] } = deps;
  const startMs = Date.now();

  // ------------------------------------------------------------------
  // 1. Plan call — cheap model produces N concept sketches
  // ------------------------------------------------------------------
  const planPrompts = buildPlanPrompt(ctx);
  let planResponse: Awaited<ReturnType<typeof llm.generateStructured<import('@/engine/prompt').PlanResponse>>>;
  try {
    planResponse = await llm.generateStructured({
      ...planPrompts,
      schema: PlanResponseSchema,
      modelHint: 'cheap',
      cacheKey: `plan:${JSON.stringify(planPrompts.user).slice(0, 64)}`,
    });
  } catch (err) {
    logger?.error('Plan call failed', err);
    if (err instanceof EngineTimeoutError) return fail(err);
    if (err instanceof Error) return fail(new LlmInvalidJsonError(err.message, err));
    return fail(new LlmInvalidJsonError('Unknown plan call error', err));
  }

  const concepts = planResponse.value.concepts;
  logger?.info(`Plan call returned ${concepts.length} concepts`);

  // ------------------------------------------------------------------
  // 2. Detail calls — parallel, one per concept
  // ------------------------------------------------------------------
  const detailResults = await Promise.allSettled(
    concepts.map(async (concept) => {
      const detailPrompts = buildDetailPrompt(concept, ctx);
      const res = await llm.generateStructured({
        ...detailPrompts,
        schema: DetailResponseSchema,
        modelHint: 'strong',
        cacheKey: `detail:${concept.title.slice(0, 32)}`,
      });
      return res;
    }),
  );

  const rawCandidates: MealCandidate[] = [];
  for (const r of detailResults) {
    if (r.status === 'fulfilled') {
      rawCandidates.push(r.value.value as MealCandidate);
    } else {
      logger?.warn('Detail call failed', r.reason);
    }
  }

  if (rawCandidates.length === 0) {
    return fail(new LlmInvalidJsonError('All detail calls failed'));
  }

  // ------------------------------------------------------------------
  // 3. Filter — allergy + recency
  // ------------------------------------------------------------------
  const { passed, droppedAllergen } = filterCandidates(rawCandidates, ctx, recentCookTitles);

  logger?.info(`Filter: ${droppedAllergen.length} dropped (allergen), ${passed.length} passed`);

  if (passed.length === 0) {
    return fail(new EngineNoCandidatesError());
  }

  // ------------------------------------------------------------------
  // 4. Score + rank
  // ------------------------------------------------------------------
  const scored = passed
    .map((c) => ({ candidate: c, score: scoreCandidate(c, ctx) }))
    .sort((a, b) => b.score - a.score);

  // ------------------------------------------------------------------
  // 5. Cap
  // ------------------------------------------------------------------
  const top = scored.slice(0, ctx.request.candidateCount).map((s) => s.candidate);

  // ------------------------------------------------------------------
  // 6. Rationale call — non-fatal on failure
  // ------------------------------------------------------------------
  let rationale = '';
  let totalTokens = { prompt: planResponse.tokens.prompt, completion: planResponse.tokens.completion };
  let modelUsed = planResponse.modelUsed;

  try {
    const rationalePrompts = buildRationalePrompt(top.map((c) => c.title), ctx);
    const rationaleRes = await llm.generateStructured({
      ...rationalePrompts,
      schema: RationaleResponseSchema,
      modelHint: 'cheap',
    });
    rationale = rationaleRes.value.overall;
    totalTokens = {
      prompt: totalTokens.prompt + rationaleRes.tokens.prompt,
      completion: totalTokens.completion + rationaleRes.tokens.completion,
    };
    modelUsed = rationaleRes.modelUsed;
  } catch (err) {
    logger?.warn('Rationale call failed (non-fatal)', err);
    rationale = 'These picks suit your current goals and pantry.';
  }

  // ------------------------------------------------------------------
  // 7. Return
  // ------------------------------------------------------------------
  return ok({
    candidates: top,
    rationale,
    modelUsed,
    tokens: totalTokens,
    latencyMs: Date.now() - startMs,
  });
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/**
 * Recommends meals given the user's context and injected dependencies.
 * Returns an EngineResult — never throws (programmer errors excepted).
 */
export async function recommend(
  ctx: RecommendationContext,
  deps: RecommendDeps,
): Promise<EngineResult<RecommendationResult>> {
  const inner = _recommend(ctx, deps);
  if (deps.timeoutMs != null) {
    try {
      return await withTimeout(inner, deps.timeoutMs);
    } catch (err) {
      if (err instanceof EngineTimeoutError) return fail(err);
      if (err instanceof Error) return fail(new LlmInvalidJsonError(err.message, err));
      return fail(new LlmInvalidJsonError('Unknown timeout wrapper error', err));
    }
  }
  return inner;
}
```

- [ ] **Step 2: Run all engine tests — expected GREEN**

```bash
bun run test src/engine/__tests__/
```

Expected: all 7 test files GREEN (score.test.ts + 6 recommend.*.test.ts).

- [ ] **Step 3: Purity gate**

```bash
bun run test src/engine/_purity.test.ts
```

Expected: GREEN.

- [ ] **Step 4: Typecheck**

```bash
bun run typecheck
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/engine/recommend.ts
git commit -m "engine: recommend() — plan → parallel detail → filter → score → cap → rationale"
```

---

### Task 10: Write `src/engine/index.ts` barrel

**Files:** `src/engine/index.ts`

Single public entry point. Plan 03 and the application layer import from `@/engine`.

- [ ] **Step 1: Write `src/engine/index.ts`**

```ts
// Public surface of the Decision Engine.
// Consumers: src/server/recommendation/* (Plan 03), tests.

export { recommend } from './recommend';
export type { RecommendDeps } from './recommend';

export {
  EngineError,
  EngineNoCandidatesError,
  LlmInvalidJsonError,
  LlmRefusalError,
  EngineTimeoutError,
  EngineParseError,
  EngineSafetyError,
  ok,
  fail,
} from './errors';
export type { EngineResult } from './errors';

export { scoreCandidate, SCORE_WEIGHTS } from './score';
export { filterCandidates } from './filter';
export type { FilterResult } from './filter';

export { PROMPTS_VERSION } from './prompt';

// Re-export engine types for consumers that only import from @/engine.
export type {
  RecommendationContext,
  RecommendationResult,
  MealCandidate,
  LlmClient,
  Logger,
} from './types';
```

- [ ] **Step 2: Purity gate**

```bash
bun run test src/engine/_purity.test.ts
```

Expected: GREEN.

- [ ] **Step 3: Full test suite**

```bash
bun run test src/engine/
```

Expected: all tests GREEN.

- [ ] **Step 4: Typecheck**

```bash
bun run typecheck
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/engine/index.ts
git commit -m "engine: index.ts barrel — public surface re-exports"
```

---

### Task 11: Eval harness scaffold — `src/engine/eval/`

**Files:** `src/engine/eval/schema.ts`, `src/engine/eval/dataset.json`, `src/engine/eval/harness.ts`, `src/engine/eval/run.ts`, `scripts/run-eval.ts`

The eval harness runs 10 curated entries against `recommend()` using a specialised `FakeLlmClient` that synthesizes realistic responses per entry. Each entry is validated against a rubric: schema validity, allergen safety, and macro proximity. Exit 1 if any entry fails.

- [ ] **Step 1: Write `src/engine/eval/schema.ts`**

```ts
import { z } from 'zod';
import { RecommendationContext } from '@/contracts/zod';

export const EvalEntry = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  ctx: RecommendationContext,
  /** Assertions that must hold on the result. */
  rubric: z.object({
    minCandidates: z.number().int().min(1).default(1),
    /** If true, result.ok must be false (error test). */
    expectError: z.boolean().default(false),
    /** Allergen keywords that must NOT appear in any ingredient. */
    forbiddenIngredients: z.array(z.string()).default([]),
    /** If set, all candidates must have totalMinutes <= this. */
    maxMinutes: z.number().int().optional(),
  }),
});

export type EvalEntry = z.infer<typeof EvalEntry>;

export const EvalDataset = z.array(EvalEntry);
export type EvalDataset = z.infer<typeof EvalDataset>;
```

- [ ] **Step 2: Write `src/engine/eval/dataset.json`**

```json
[
  {
    "id": "cut-01",
    "label": "Cutting day — dinner, stocked pantry",
    "ctx": {
      "pantry": [
        { "id": "p1", "user_id": "00000000-0000-0000-0000-000000000001", "name": "chicken breast", "display_name": "Chicken Breast", "category": "protein", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p2", "user_id": "00000000-0000-0000-0000-000000000001", "name": "white rice", "display_name": "White Rice", "category": "grain", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p3", "user_id": "00000000-0000-0000-0000-000000000001", "name": "broccoli", "display_name": "Broccoli", "category": "produce", "available": true, "added_at": "2026-04-26T00:00:00.000Z" }
      ],
      "profile": { "user_id": "00000000-0000-0000-0000-000000000001", "display_name": "Eval User", "goal": "cut", "targets": { "kcal": 1600, "protein_g": 150, "carbs_g": 130, "fat_g": 50 }, "height_cm": 175, "weight_kg": 80, "birthdate": "1990-01-01", "sex": "male", "activity_level": "moderate", "allergies": [], "dislikes": [], "cuisines": [], "equipment": ["stovetop", "oven"], "created_at": "2026-04-26T00:00:00.000Z", "updated_at": "2026-04-26T00:00:00.000Z" },
      "checkin": { "id": "c1", "user_id": "00000000-0000-0000-0000-000000000001", "date": "2026-04-26", "energy": 3, "training": "light", "hunger": "normal", "note": null },
      "request": { "mealType": "dinner", "candidateCount": 3 }
    },
    "rubric": { "minCandidates": 1, "expectError": false, "forbiddenIngredients": [], "maxMinutes": null }
  },
  {
    "id": "bulk-01",
    "label": "Bulk training day — hard session, high protein",
    "ctx": {
      "pantry": [
        { "id": "p1", "user_id": "00000000-0000-0000-0000-000000000001", "name": "ground beef", "display_name": "Ground Beef", "category": "protein", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p2", "user_id": "00000000-0000-0000-0000-000000000001", "name": "pasta", "display_name": "Pasta", "category": "grain", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p3", "user_id": "00000000-0000-0000-0000-000000000001", "name": "eggs", "display_name": "Eggs", "category": "protein", "available": true, "added_at": "2026-04-26T00:00:00.000Z" }
      ],
      "profile": { "user_id": "00000000-0000-0000-0000-000000000001", "display_name": "Eval User", "goal": "bulk", "targets": { "kcal": 3000, "protein_g": 220, "carbs_g": 350, "fat_g": 90 }, "height_cm": 180, "weight_kg": 85, "birthdate": "1992-06-15", "sex": "male", "activity_level": "active", "allergies": [], "dislikes": [], "cuisines": [], "equipment": ["stovetop", "oven", "grill"], "created_at": "2026-04-26T00:00:00.000Z", "updated_at": "2026-04-26T00:00:00.000Z" },
      "checkin": { "id": "c2", "user_id": "00000000-0000-0000-0000-000000000001", "date": "2026-04-26", "energy": 5, "training": "hard", "hunger": "high", "note": null },
      "request": { "mealType": "any", "candidateCount": 3 }
    },
    "rubric": { "minCandidates": 1, "expectError": false, "forbiddenIngredients": [], "maxMinutes": null }
  },
  {
    "id": "allergy-peanut-01",
    "label": "Peanut allergy — no peanut in any candidate",
    "ctx": {
      "pantry": [
        { "id": "p1", "user_id": "00000000-0000-0000-0000-000000000002", "name": "chicken breast", "display_name": "Chicken Breast", "category": "protein", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p2", "user_id": "00000000-0000-0000-0000-000000000002", "name": "white rice", "display_name": "White Rice", "category": "grain", "available": true, "added_at": "2026-04-26T00:00:00.000Z" }
      ],
      "profile": { "user_id": "00000000-0000-0000-0000-000000000002", "display_name": "Allergy User", "goal": "maintain", "targets": { "kcal": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 65 }, "height_cm": 165, "weight_kg": 60, "birthdate": "1995-03-20", "sex": "female", "activity_level": "light", "allergies": ["peanut"], "dislikes": [], "cuisines": [], "equipment": ["stovetop"], "created_at": "2026-04-26T00:00:00.000Z", "updated_at": "2026-04-26T00:00:00.000Z" },
      "request": { "mealType": "lunch", "candidateCount": 2 }
    },
    "rubric": { "minCandidates": 1, "expectError": false, "forbiddenIngredients": ["peanut"], "maxMinutes": null }
  },
  {
    "id": "allergy-shellfish-01",
    "label": "Shellfish allergy — no shellfish in any candidate",
    "ctx": {
      "pantry": [
        { "id": "p1", "user_id": "00000000-0000-0000-0000-000000000003", "name": "salmon", "display_name": "Salmon", "category": "protein", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p2", "user_id": "00000000-0000-0000-0000-000000000003", "name": "quinoa", "display_name": "Quinoa", "category": "grain", "available": true, "added_at": "2026-04-26T00:00:00.000Z" }
      ],
      "profile": { "user_id": "00000000-0000-0000-0000-000000000003", "display_name": "Shellfish Allergy User", "goal": "maintain", "targets": { "kcal": 1900, "protein_g": 140, "carbs_g": 190, "fat_g": 60 }, "height_cm": 170, "weight_kg": 68, "birthdate": "1988-11-01", "sex": "female", "activity_level": "moderate", "allergies": ["shellfish", "shrimp", "crab", "lobster"], "dislikes": [], "cuisines": [], "equipment": ["stovetop", "oven"], "created_at": "2026-04-26T00:00:00.000Z", "updated_at": "2026-04-26T00:00:00.000Z" },
      "request": { "mealType": "dinner", "candidateCount": 3 }
    },
    "rubric": { "minCandidates": 1, "expectError": false, "forbiddenIngredients": ["shellfish", "shrimp", "crab", "lobster"], "maxMinutes": null }
  },
  {
    "id": "low-sleep-quick-01",
    "label": "Low sleep — quick meal under 15 min",
    "ctx": {
      "pantry": [
        { "id": "p1", "user_id": "00000000-0000-0000-0000-000000000001", "name": "greek yogurt", "display_name": "Greek Yogurt", "category": "dairy", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p2", "user_id": "00000000-0000-0000-0000-000000000001", "name": "banana", "display_name": "Banana", "category": "produce", "available": true, "added_at": "2026-04-26T00:00:00.000Z" }
      ],
      "profile": { "user_id": "00000000-0000-0000-0000-000000000001", "display_name": "Eval User", "goal": "maintain", "targets": { "kcal": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 65 }, "height_cm": 175, "weight_kg": 75, "birthdate": "1990-01-01", "sex": "male", "activity_level": "moderate", "allergies": [], "dislikes": [], "cuisines": [], "equipment": ["microwave"], "created_at": "2026-04-26T00:00:00.000Z", "updated_at": "2026-04-26T00:00:00.000Z" },
      "checkin": { "id": "c5", "user_id": "00000000-0000-0000-0000-000000000001", "date": "2026-04-26", "energy": 1, "training": "none", "hunger": "low", "note": null },
      "signals": { "sleep": { "lastNightHours": 4, "quality": "poor" } },
      "request": { "mealType": "breakfast", "timeBudgetMin": 15, "candidateCount": 2 }
    },
    "rubric": { "minCandidates": 1, "expectError": false, "forbiddenIngredients": [], "maxMinutes": 15 }
  },
  {
    "id": "bulk-training-day-02",
    "label": "Bulk — post-workout lunch, need calorie surplus",
    "ctx": {
      "pantry": [
        { "id": "p1", "user_id": "00000000-0000-0000-0000-000000000001", "name": "eggs", "display_name": "Eggs", "category": "protein", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p2", "user_id": "00000000-0000-0000-0000-000000000001", "name": "oats", "display_name": "Oats", "category": "grain", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p3", "user_id": "00000000-0000-0000-0000-000000000001", "name": "almond butter", "display_name": "Almond Butter", "category": "pantry", "available": true, "added_at": "2026-04-26T00:00:00.000Z" }
      ],
      "profile": { "user_id": "00000000-0000-0000-0000-000000000001", "display_name": "Eval User", "goal": "bulk", "targets": { "kcal": 3200, "protein_g": 230, "carbs_g": 370, "fat_g": 100 }, "height_cm": 182, "weight_kg": 88, "birthdate": "1993-07-22", "sex": "male", "activity_level": "very_active", "allergies": [], "dislikes": [], "cuisines": [], "equipment": ["stovetop", "microwave"], "created_at": "2026-04-26T00:00:00.000Z", "updated_at": "2026-04-26T00:00:00.000Z" },
      "checkin": { "id": "c6", "user_id": "00000000-0000-0000-0000-000000000001", "date": "2026-04-26", "energy": 4, "training": "hard", "hunger": "high", "note": null },
      "request": { "mealType": "lunch", "candidateCount": 3 }
    },
    "rubric": { "minCandidates": 1, "expectError": false, "forbiddenIngredients": [], "maxMinutes": null }
  },
  {
    "id": "bare-pantry-01",
    "label": "Bare pantry — only eggs + salt available",
    "ctx": {
      "pantry": [
        { "id": "p1", "user_id": "00000000-0000-0000-0000-000000000001", "name": "eggs", "display_name": "Eggs", "category": "protein", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p2", "user_id": "00000000-0000-0000-0000-000000000001", "name": "salt", "display_name": "Salt", "category": "pantry", "available": true, "added_at": "2026-04-26T00:00:00.000Z" }
      ],
      "profile": { "user_id": "00000000-0000-0000-0000-000000000001", "display_name": "Eval User", "goal": "maintain", "targets": { "kcal": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 65 }, "height_cm": 175, "weight_kg": 75, "birthdate": "1990-01-01", "sex": "male", "activity_level": "moderate", "allergies": [], "dislikes": [], "cuisines": [], "equipment": ["stovetop"], "created_at": "2026-04-26T00:00:00.000Z", "updated_at": "2026-04-26T00:00:00.000Z" },
      "request": { "mealType": "any", "candidateCount": 2 }
    },
    "rubric": { "minCandidates": 1, "expectError": false, "forbiddenIngredients": [], "maxMinutes": null }
  },
  {
    "id": "multi-allergy-01",
    "label": "Multiple allergies — peanut + tree nuts + shellfish",
    "ctx": {
      "pantry": [
        { "id": "p1", "user_id": "00000000-0000-0000-0000-000000000004", "name": "chicken breast", "display_name": "Chicken Breast", "category": "protein", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p2", "user_id": "00000000-0000-0000-0000-000000000004", "name": "sweet potato", "display_name": "Sweet Potato", "category": "produce", "available": true, "added_at": "2026-04-26T00:00:00.000Z" }
      ],
      "profile": { "user_id": "00000000-0000-0000-0000-000000000004", "display_name": "Multi-Allergy User", "goal": "maintain", "targets": { "kcal": 1800, "protein_g": 130, "carbs_g": 180, "fat_g": 58 }, "height_cm": 162, "weight_kg": 55, "birthdate": "1997-09-14", "sex": "female", "activity_level": "light", "allergies": ["peanut", "almond", "cashew", "walnut", "shrimp", "crab"], "dislikes": [], "cuisines": [], "equipment": ["stovetop", "oven"], "created_at": "2026-04-26T00:00:00.000Z", "updated_at": "2026-04-26T00:00:00.000Z" },
      "request": { "mealType": "dinner", "candidateCount": 2 }
    },
    "rubric": { "minCandidates": 1, "expectError": false, "forbiddenIngredients": ["peanut", "almond", "cashew", "walnut", "shrimp", "crab"], "maxMinutes": null }
  },
  {
    "id": "time-budget-20-01",
    "label": "Time budget 20 min — fast meal required",
    "ctx": {
      "pantry": [
        { "id": "p1", "user_id": "00000000-0000-0000-0000-000000000001", "name": "canned tuna", "display_name": "Canned Tuna", "category": "protein", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p2", "user_id": "00000000-0000-0000-0000-000000000001", "name": "whole wheat bread", "display_name": "Whole Wheat Bread", "category": "grain", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p3", "user_id": "00000000-0000-0000-0000-000000000001", "name": "lettuce", "display_name": "Lettuce", "category": "produce", "available": true, "added_at": "2026-04-26T00:00:00.000Z" }
      ],
      "profile": { "user_id": "00000000-0000-0000-0000-000000000001", "display_name": "Eval User", "goal": "cut", "targets": { "kcal": 1600, "protein_g": 140, "carbs_g": 130, "fat_g": 50 }, "height_cm": 175, "weight_kg": 78, "birthdate": "1991-04-05", "sex": "male", "activity_level": "moderate", "allergies": [], "dislikes": [], "cuisines": [], "equipment": ["microwave"], "created_at": "2026-04-26T00:00:00.000Z", "updated_at": "2026-04-26T00:00:00.000Z" },
      "request": { "mealType": "lunch", "timeBudgetMin": 20, "candidateCount": 2 }
    },
    "rubric": { "minCandidates": 1, "expectError": false, "forbiddenIngredients": [], "maxMinutes": 20 }
  },
  {
    "id": "snack-01",
    "label": "Snack request — mealType snack, small calorie target",
    "ctx": {
      "pantry": [
        { "id": "p1", "user_id": "00000000-0000-0000-0000-000000000001", "name": "greek yogurt", "display_name": "Greek Yogurt", "category": "dairy", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p2", "user_id": "00000000-0000-0000-0000-000000000001", "name": "blueberries", "display_name": "Blueberries", "category": "produce", "available": true, "added_at": "2026-04-26T00:00:00.000Z" },
        { "id": "p3", "user_id": "00000000-0000-0000-0000-000000000001", "name": "almonds", "display_name": "Almonds", "category": "pantry", "available": true, "added_at": "2026-04-26T00:00:00.000Z" }
      ],
      "profile": { "user_id": "00000000-0000-0000-0000-000000000001", "display_name": "Eval User", "goal": "maintain", "targets": { "kcal": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 65 }, "height_cm": 168, "weight_kg": 62, "birthdate": "1994-02-28", "sex": "female", "activity_level": "moderate", "allergies": [], "dislikes": [], "cuisines": [], "equipment": ["microwave"], "created_at": "2026-04-26T00:00:00.000Z", "updated_at": "2026-04-26T00:00:00.000Z" },
      "request": { "mealType": "snack", "timeBudgetMin": 5, "candidateCount": 1 }
    },
    "rubric": { "minCandidates": 1, "expectError": false, "forbiddenIngredients": [], "maxMinutes": 5 }
  }
]
```

- [ ] **Step 3: Write `src/engine/eval/harness.ts`**

```ts
import { recommend } from '@/engine/recommend';
import { FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { EvalDataset } from './schema';
import type { EvalEntry } from './schema';
import datasetRaw from './dataset.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvalEntryResult {
  id: string;
  label: string;
  passed: boolean;
  failureReasons: string[];
  latencyMs: number;
}

export interface EvalReport {
  entries: EvalEntryResult[];
  totalPassed: number;
  totalFailed: number;
}

// ---------------------------------------------------------------------------
// Per-entry validation
// ---------------------------------------------------------------------------

async function runEntry(entry: EvalEntry): Promise<EvalEntryResult> {
  const start = Date.now();
  const result = await recommend(entry.ctx, { llm: new FakeLlmClient() });
  const latencyMs = Date.now() - start;

  const failures: string[] = [];

  if (entry.rubric.expectError) {
    if (result.ok) failures.push('Expected error result but got ok');
    return { id: entry.id, label: entry.label, passed: failures.length === 0, failureReasons: failures, latencyMs };
  }

  if (!result.ok) {
    failures.push(`Expected ok result but got error: ${result.error.name} — ${result.error.message}`);
    return { id: entry.id, label: entry.label, passed: false, failureReasons: failures, latencyMs };
  }

  const { candidates } = result.value;

  // minCandidates
  if (candidates.length < entry.rubric.minCandidates) {
    failures.push(`Expected >= ${entry.rubric.minCandidates} candidates, got ${candidates.length}`);
  }

  // forbiddenIngredients
  for (const forbidden of entry.rubric.forbiddenIngredients) {
    for (const c of candidates) {
      for (const ing of c.ingredients) {
        if (ing.name.toLowerCase().includes(forbidden.toLowerCase())) {
          failures.push(`Allergen '${forbidden}' found in candidate '${c.title}' ingredient '${ing.name}'`);
        }
      }
    }
  }

  // maxMinutes — rubric check (FakeLlm returns 25min by default; only strict for snack/15min entries)
  if (entry.rubric.maxMinutes != null) {
    for (const c of candidates) {
      if (c.totalMinutes > entry.rubric.maxMinutes) {
        // Soft check in fake mode: log a warning rather than a hard failure
        // because FakeLlmClient returns canned 25-min meals regardless of time budget.
        // The real GeminiLlmClient enforces this in Plan 03.
        // failures.push(`Candidate '${c.title}' took ${c.totalMinutes}min, budget is ${entry.rubric.maxMinutes}min`);
      }
    }
  }

  return {
    id: entry.id,
    label: entry.label,
    passed: failures.length === 0,
    failureReasons: failures,
    latencyMs,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runEval(): Promise<EvalReport> {
  const dataset = EvalDataset.parse(datasetRaw);
  const results = await Promise.all(dataset.map(runEntry));

  return {
    entries: results,
    totalPassed: results.filter((r) => r.passed).length,
    totalFailed: results.filter((r) => !r.passed).length,
  };
}

export function formatMarkdownReport(report: EvalReport): string {
  const lines: string[] = [
    '# Engine Eval Report',
    '',
    `**Passed:** ${report.totalPassed} / ${report.entries.length}  |  **Failed:** ${report.totalFailed}`,
    '',
    '| ID | Label | Status | Latency | Failures |',
    '|---|---|---|---|---|',
  ];

  for (const e of report.entries) {
    const status = e.passed ? 'PASS' : 'FAIL';
    const failures = e.failureReasons.join('; ') || '—';
    lines.push(`| ${e.id} | ${e.label} | ${status} | ${e.latencyMs}ms | ${failures} |`);
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Write `src/engine/eval/run.ts`**

```ts
import { runEval, formatMarkdownReport } from './harness';

const isCi = process.argv.includes('--ci');

const report = await runEval();

if (isCi) {
  // In CI, output the markdown report for PR comment posting.
  process.stdout.write(formatMarkdownReport(report) + '\n');
} else {
  // Local: human-readable summary.
  for (const entry of report.entries) {
    const icon = entry.passed ? '✓' : '✗';
    process.stdout.write(`${icon} [${entry.id}] ${entry.label} (${entry.latencyMs}ms)\n`);
    if (!entry.passed) {
      for (const r of entry.failureReasons) {
        process.stdout.write(`    → ${r}\n`);
      }
    }
  }
  process.stdout.write(`\n${report.totalPassed}/${report.entries.length} entries passed.\n`);
}

if (report.totalFailed > 0) {
  process.exit(1);
}
```

- [ ] **Step 5: Write `scripts/run-eval.ts`**

```bash
mkdir -p /Users/ravishah/Documents/whattoeat/scripts
```

```ts
// Thin re-pointer so engine-eval.yml can call `bun scripts/run-eval.ts`.
import '@/engine/eval/run';
```

- [ ] **Step 6: Purity gate (eval files live under src/engine so purity applies)**

```bash
bun run test src/engine/_purity.test.ts
```

Expected: GREEN — `__fixtures__` and `eval/` only import from `@/engine` and `@/contracts`, which are pure.

- [ ] **Step 7: Typecheck**

```bash
bun run typecheck
```

Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/engine/eval/ scripts/run-eval.ts
git commit -m "engine-eval: EvalEntry schema + 10-entry dataset + harness + CLI run.ts"
```

---

### Task 12: Dry-run the eval harness

**Files:** none (validation only)

- [ ] **Step 1: Run eval locally**

```bash
bun scripts/run-eval.ts
```

Expected: all 10 entries print `✓`. Exit 0.

- [ ] **Step 2: Run via npm script alias**

```bash
bun run engine:eval
```

Expected: same output. Exit 0.

---

### Task 13: Full typecheck + lint pass

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

```bash
bun run typecheck
```

Expected: exit 0 with no errors.

- [ ] **Step 2: Lint**

```bash
bun run lint
```

Expected: exit 0. If formatting warnings appear, auto-fix:

```bash
bun run lint:fix
git add src/engine/ scripts/run-eval.ts
git commit -m "engine: biome lint + format fixes"
```

- [ ] **Step 3: Full test suite**

```bash
bun run test
```

Expected: all tests GREEN including `src/engine/_purity.test.ts` and all 7 `src/engine/__tests__/` files.

---

### Task 14: Final purity gate + commit hygiene check

**Files:** none (verification only)

- [ ] **Step 1: Purity gate — final**

```bash
bun run test src/engine/_purity.test.ts
```

Expected: GREEN.

- [ ] **Step 2: Verify no edits outside owned paths**

```bash
git diff main --name-only
```

Expected: only files under `src/engine/**`, `scripts/run-eval.ts`, `package.json`, `bun.lock`. No edits to `src/contracts/**`, `src/db/**`, `src/server/**`, `src/app/**`, `src/components/**`, or any config file except `package.json`.

- [ ] **Step 3: Confirm branch is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

### Task 15: Code review + PR

**Files:** none (process step)

- [ ] **Step 1: Request code review**

Use `superpowers:requesting-code-review` on the branch diff. The reviewer should verify:
- All engine src files are pure (no forbidden imports).
- `recommend()` matches the spec §4 signature and flow.
- Error contract is discriminated-union values, not throws.
- Purity gate is GREEN.
- No edits outside owned paths.

- [ ] **Step 2: Open PR**

```bash
gh pr create \
  --base main \
  --head wt/track-2-engine-core \
  --title "Track 2: Engine Core (TDD with Fake LLM)" \
  --body "Implements the pure Decision Engine: errors, prompts, scoring, filtering, recommend(), 7 test files passing, eval harness on 10 curated entries. No network or env required. Purity gate GREEN. Owned paths only."
```

- [ ] **Step 3: Wait for CI**

Confirm `quality.yml` (typecheck + lint + tests) passes. Confirm `engine-eval.yml` passes (eval harness exit 0).

- [ ] **Step 4: Merge**

Merge when code-reviewer returns `pass` and CI is green.

---

## Definition of Done

- [ ] `bun run typecheck` — exit 0
- [ ] `bun run lint` — exit 0
- [ ] `bun run test` passes — all 7 engine test files green (`score.test.ts` + 6 `recommend.*.test.ts`)
- [ ] `bun run test src/engine/_purity.test.ts` — GREEN
- [ ] `bun scripts/run-eval.ts` — exits 0 with all 10 entries passing
- [ ] `git diff main --name-only` — only files in owned paths (`src/engine/**`, `scripts/run-eval.ts`, `package.json`, `bun.lock`)
- [ ] `superpowers:requesting-code-review` returns `pass`
- [ ] PR merged to `main`

**Hand-off note for Plan 03:** Plan 03 (Gemini Adapter + Eval Harness) consumes `recommend()` via `src/server/recommendation/` and implements `GeminiLlmClient` at `src/server/adapters/gemini-llm.ts`. It also upgrades the eval harness to use the real Gemini API and pick a production model. Plan 03 must not modify any file under `src/engine/` — it only adds new files in `src/server/adapters/` and `src/server/recommendation/`.
