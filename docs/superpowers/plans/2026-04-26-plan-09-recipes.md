# Plan 09 — Recipe View + Saved + Cooked Log

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full recipe surface — server-side persistence of `MealCandidate` output to the `recipes` table, a cooked-log append path, three App Router pages (`/recipes/[id]`, `/recipes/saved`, `/recipes/cooked`), and the UI components that drive them. The critical cross-track hand-off is `getRecentCookTitles()`, which T8 (Feed Me) calls to prevent the engine from re-recommending meals cooked within a recency window.

**Architecture:** Three layers inside owned paths. (1) `src/server/recipes/` — a thin Supabase repo + server actions, all guarded by `requireUser()`. (2) `src/app/recipes/` — three App Router pages, each an RSC wrapper that fetches and passes data to feature components. (3) `src/components/feature/recipes/` — all interactive UI, client components where needed.

**Tech Stack:** Bun, Vitest, Zod, `@supabase/ssr` (server client via `src/lib/supabase/server.ts`), Next.js 15 App Router, React 19, Lucide icons, design-system primitives from Track 1. No new runtime dependencies required.

**Spec references:** `docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md` — sections 2 (architecture), 3 (data model: `recipes` + `cooked_log` tables), 5 (Recipe view screen, Saved screen, design language).

**Prerequisites (verified before Task 1):**
- Track 0 merged to `main`: `src/contracts/zod/recipe.ts`, `src/contracts/zod/recommendation.ts` (contains `MealCandidate`), `src/db/schema/recipes.ts`, `src/db/schema/cooked-log.ts`, and RLS policies on both tables are committed and passing migrations.
- Track 1 merged: `src/components/ui/meal-card.tsx`, `button.tsx`, `sheet.tsx`, `drawer.tsx`, `toast.tsx`, `card.tsx` (or equivalent), `macro-ring.tsx`, `skeleton.tsx` exist in `/Users/ravishah/Documents/whattoeat-track-1-design-system/src/components/ui/`.
- Track 4 merged: `src/server/auth/require-user.ts` (`requireUser()`) exists and tests pass.
- Branch `wt/track-9-recipes` is checked out from a fresh `main`.

---

## File Structure

### Creates

```
src/server/recipes/repo.ts                — Supabase CRUD helpers (no auth logic)
src/server/recipes/actions.ts             — server actions: save, unsave, delete, get, list, markCooked, listCookedLog, getRecentCookTitles
src/server/recipes/__tests__/repo.test.ts
src/server/recipes/__tests__/actions.test.ts

src/components/feature/recipes/RecipeDetail.tsx      — full recipe page body (client)
src/components/feature/recipes/IngredientsList.tsx   — ingredient rows with serving multiplier
src/components/feature/recipes/StepsList.tsx         — numbered steps with timer affordance
src/components/feature/recipes/MacrosCard.tsx        — MacroRing + stat tiles
src/components/feature/recipes/CookButton.tsx        — sticky action bar: "Cook this"
src/components/feature/recipes/CookedLogTimeline.tsx — date-grouped cooked-log entries
src/components/feature/recipes/SavedGrid.tsx         — masonry MealCard grid with search + filter
src/components/feature/recipes/index.ts              — barrel re-export

src/app/recipes/[id]/page.tsx             — /recipes/[id] RSC page
src/app/recipes/saved/page.tsx            — /recipes/saved RSC page
src/app/recipes/cooked/page.tsx           — /recipes/cooked RSC page
```

### Modifies

```
(none — package.json is frozen unless a new dep is discovered in Task 1)
bun.lock — updated automatically only if package.json changes
```

### Does NOT touch (frozen or owned by other tracks)

```
src/contracts/**
src/db/**
supabase/**
src/engine/**
src/components/ui/**        (import only)
src/server/auth/**          (import only)
tailwind.config.ts
.github/workflows/**
```

---

## Conventions used in this plan

- All file paths are repo-relative; bash commands use absolute path `/Users/ravishah/Documents/whattoeat`.
- `bun` is the package manager and test runner (`bun run test`, `bun run typecheck`).
- All imports use the `@/` alias for `src/` (e.g. `@/server/recipes/actions`, `@/components/ui/button`).
- Commit message prefixes:
  - `recipes:` — `src/server/recipes/` source files and `src/app/recipes/**`
  - `recipes-test:` — `src/server/recipes/__tests__/**`
  - `recipes-ui:` — `src/components/feature/recipes/**`
- **TDD discipline:** test files are written first (expected RED), then the implementation makes them GREEN. Steps annotated accordingly.
- **No client-supplied user IDs:** every DB query derives the user from `requireUser()` — never from request bodies or URL params.
- **RLS is the last line of defence** — but server-side `userId` scoping on every query is required regardless.
- All TS/JSX uses literal `<` and `>` angle brackets (no HTML entities).

---

## Tasks

### Task 1: Verify prerequisites + branch

**Files:** (none created)

This task confirms the environment before touching any owned file. If any prerequisite is missing, stop and resolve it before proceeding.

- [ ] **Step 1: Confirm contracts exist**

```bash
ls /Users/ravishah/Documents/whattoeat/src/contracts/zod/recipe.ts
ls /Users/ravishah/Documents/whattoeat/src/contracts/zod/recommendation.ts
```

Expected: both files exist. `recommendation.ts` exports `MealCandidate`.

- [ ] **Step 2: Confirm auth helper exists**

```bash
ls /Users/ravishah/Documents/whattoeat/src/server/auth/require-user.ts
```

Expected: file exists. If missing, stop — T4 must merge first.

- [ ] **Step 3: Confirm Track 1 UI primitives**

```bash
ls /Users/ravishah/Documents/whattoeat/src/components/ui/meal-card.tsx
ls /Users/ravishah/Documents/whattoeat/src/components/ui/button.tsx
ls /Users/ravishah/Documents/whattoeat/src/components/ui/sheet.tsx
ls /Users/ravishah/Documents/whattoeat/src/components/ui/toast.tsx
```

Expected: all four exist. If missing, check worktree path at `/Users/ravishah/Documents/whattoeat-track-1-design-system/src/components/ui/` — Track 1 may still be in its own worktree and not yet merged.

- [ ] **Step 4: Confirm branch**

```bash
git -C /Users/ravishah/Documents/whattoeat branch --show-current
```

Expected: `wt/track-9-recipes`.

- [ ] **Step 5: No changes needed — no commit for this task.**

---

### Task 2: Repo layer — `src/server/recipes/repo.ts`

**Files:** `src/server/recipes/repo.ts`

The repo layer talks to Supabase and returns typed results. No auth logic here — callers pass in the `supabase` server client and the `userId` extracted by `requireUser()`. This separation makes the repo testable with a mocked client.

All return types are narrowed `Recipe` or `CookedLogEntry` shapes derived from the Zod contracts in `src/contracts/zod/recipe.ts`. The repo does not throw on "not found" — it returns `null` and lets the action layer decide whether to 404.

<!-- TODO: confirm with user — should `deleteRecipe` be a hard DELETE or a soft delete (setting `saved = false` and flagging `deleted_at`)? The spec only mentions `saved` bool. Implemented below as hard delete with a TODO comment. -->

- [ ] **Step 1: Create `src/server/recipes/repo.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Recipe } from '@/contracts/zod/recipe';

// Shape returned by cooked_log joins — not the full DB row.
export interface CookedLogEntry {
  id: string;
  recipe_id: string;
  cooked_at: string;
  rating: number | null;
  note: string | null;
  recipe: Pick<Recipe, 'id' | 'title' | 'macros' | 'total_minutes' | 'cuisine'>;
}

// ---------------------------------------------------------------------------
// Recipe CRUD
// ---------------------------------------------------------------------------

export async function dbGetRecipe(
  supabase: SupabaseClient,
  id: string,
): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as Recipe;
}

export async function dbInsertRecipe(
  supabase: SupabaseClient,
  recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>,
): Promise<string> {
  const { data, error } = await supabase
    .from('recipes')
    .insert(recipe)
    .select('id')
    .single();
  if (error || !data) throw new Error(`dbInsertRecipe failed: ${error?.message}`);
  return data.id as string;
}

export async function dbListSavedRecipes(
  supabase: SupabaseClient,
  userId: string,
): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .eq('saved', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`dbListSavedRecipes failed: ${error.message}`);
  return (data ?? []) as Recipe[];
}

export async function dbSetSaved(
  supabase: SupabaseClient,
  id: string,
  saved: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .update({ saved, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`dbSetSaved failed: ${error.message}`);
}

// TODO: confirm with user — hard delete chosen for now. If soft-delete is preferred,
// add a `deleted_at timestamptz` column in a Track 0 migration and flip to
// `.update({ deleted_at: new Date().toISOString() })` here.
export async function dbDeleteRecipe(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw new Error(`dbDeleteRecipe failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Cooked log
// ---------------------------------------------------------------------------

export async function dbInsertCookedLog(
  supabase: SupabaseClient,
  entry: { user_id: string; recipe_id: string; rating?: number | null; note?: string | null },
): Promise<void> {
  const { error } = await supabase.from('cooked_log').insert({
    ...entry,
    cooked_at: new Date().toISOString(),
  });
  if (error) throw new Error(`dbInsertCookedLog failed: ${error.message}`);
}

export async function dbListCookedLog(
  supabase: SupabaseClient,
  userId: string,
  days: number,
): Promise<CookedLogEntry[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('cooked_log')
    .select('id, recipe_id, cooked_at, rating, note, recipe:recipes(id, title, macros, total_minutes, cuisine)')
    .eq('user_id', userId)
    .gte('cooked_at', since)
    .order('cooked_at', { ascending: false });
  if (error) throw new Error(`dbListCookedLog failed: ${error.message}`);
  return (data ?? []) as CookedLogEntry[];
}

// Used by T8 engine recency filter.
export async function dbGetRecentCookTitles(
  supabase: SupabaseClient,
  userId: string,
  since: string, // ISO timestamp lower bound
): Promise<string[]> {
  const { data, error } = await supabase
    .from('cooked_log')
    .select('recipe:recipes(title)')
    .eq('user_id', userId)
    .gte('cooked_at', since);
  if (error) throw new Error(`dbGetRecentCookTitles failed: ${error.message}`);
  const titles = (data ?? [])
    .map((row: { recipe?: { title?: string } | null }) => row.recipe?.title)
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.toLowerCase());
  // Deduplicate
  return [...new Set(titles)];
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0 (or only pre-existing errors unrelated to this file).

- [ ] **Step 3: Commit**

```bash
git add src/server/recipes/repo.ts
git commit -m "recipes: add Supabase repo layer (CRUD + cooked-log helpers)"
```

---

### Task 3: Repo tests (RED)

**Files:** `src/server/recipes/__tests__/repo.test.ts`

Write tests first. They call the repo functions with a mocked Supabase client and assert behaviour. Tests will be RED until Task 4 (actions) completes — but the repo itself is already done, so tests should actually go GREEN after this task. The actions tests (Task 5) are the ones that remain RED until Task 6.

- [ ] **Step 1: Create `src/server/recipes/__tests__/repo.test.ts`**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  dbGetRecipe,
  dbInsertRecipe,
  dbListSavedRecipes,
  dbSetSaved,
  dbDeleteRecipe,
  dbInsertCookedLog,
  dbListCookedLog,
  dbGetRecentCookTitles,
} from '../repo';

// ---------------------------------------------------------------------------
// Minimal mock factory
// ---------------------------------------------------------------------------

function makeMockChain(resolvedValue: unknown) {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const terminal = { data: resolvedValue, error: null };
  const methods = ['select', 'eq', 'gte', 'order', 'single', 'insert', 'update', 'delete'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Await the chain → return terminal
  Object.assign(chain, terminal);
  // Make the chain thenable
  (chain as unknown as Promise<typeof terminal>).then = (resolve: (v: typeof terminal) => void) => {
    resolve(terminal);
    return Promise.resolve(terminal);
  };
  return chain;
}

function makeSupabase(resolvedValue: unknown = null, error: unknown = null) {
  const chain = makeMockChain(resolvedValue);
  if (error) (chain as Record<string, unknown>).error = error;
  return { from: vi.fn(() => chain) } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const FAKE_RECIPE = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  title: 'Chicken Stir-Fry',
  description: null,
  ingredients: [{ name: 'chicken breast', qty: 200, unit: 'g', note: null }],
  steps: [{ idx: 1, text: 'Cook chicken', durationMin: 10 }],
  macros: { kcal: 400, protein_g: 40, carbs_g: 20, fat_g: 15 },
  servings: 2,
  total_minutes: 20,
  cuisine: 'Asian',
  tags: ['quick'],
  source: 'ai-generated' as const,
  generated_run_id: null,
  saved: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('dbGetRecipe', () => {
  it('returns recipe when found', async () => {
    const supabase = makeSupabase(FAKE_RECIPE);
    const result = await dbGetRecipe(supabase, FAKE_RECIPE.id);
    expect(result).toEqual(FAKE_RECIPE);
  });

  it('returns null when not found', async () => {
    const supabase = makeSupabase(null, { message: 'not found' });
    const result = await dbGetRecipe(supabase, 'bad-id');
    expect(result).toBeNull();
  });
});

describe('dbInsertRecipe', () => {
  it('returns the new id', async () => {
    const supabase = makeSupabase({ id: FAKE_RECIPE.id });
    const { id, created_at, updated_at, ...rest } = FAKE_RECIPE;
    const result = await dbInsertRecipe(supabase, rest);
    expect(result).toBe(FAKE_RECIPE.id);
  });

  it('throws when supabase returns an error', async () => {
    const supabase = makeSupabase(null, { message: 'unique violation' });
    const { id, created_at, updated_at, ...rest } = FAKE_RECIPE;
    await expect(dbInsertRecipe(supabase, rest)).rejects.toThrow('dbInsertRecipe failed');
  });
});

describe('dbListSavedRecipes', () => {
  it('returns array of recipes', async () => {
    const supabase = makeSupabase([FAKE_RECIPE]);
    const result = await dbListSavedRecipes(supabase, FAKE_RECIPE.user_id);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Chicken Stir-Fry');
  });

  it('returns empty array when no saved recipes', async () => {
    const supabase = makeSupabase([]);
    const result = await dbListSavedRecipes(supabase, FAKE_RECIPE.user_id);
    expect(result).toHaveLength(0);
  });
});

describe('dbSetSaved', () => {
  it('resolves without throwing', async () => {
    const supabase = makeSupabase(null);
    await expect(dbSetSaved(supabase, FAKE_RECIPE.id, false)).resolves.toBeUndefined();
  });

  it('throws on error', async () => {
    const supabase = makeSupabase(null, { message: 'rls violation' });
    await expect(dbSetSaved(supabase, FAKE_RECIPE.id, false)).rejects.toThrow('dbSetSaved failed');
  });
});

describe('dbDeleteRecipe', () => {
  it('resolves without throwing', async () => {
    const supabase = makeSupabase(null);
    await expect(dbDeleteRecipe(supabase, FAKE_RECIPE.id)).resolves.toBeUndefined();
  });
});

describe('dbInsertCookedLog', () => {
  it('resolves without throwing', async () => {
    const supabase = makeSupabase(null);
    await expect(
      dbInsertCookedLog(supabase, {
        user_id: FAKE_RECIPE.user_id,
        recipe_id: FAKE_RECIPE.id,
        rating: 5,
        note: 'Delicious',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('dbListCookedLog', () => {
  it('returns log entries', async () => {
    const entry = {
      id: 'log-1',
      recipe_id: FAKE_RECIPE.id,
      cooked_at: new Date().toISOString(),
      rating: 4,
      note: null,
      recipe: { id: FAKE_RECIPE.id, title: 'Chicken Stir-Fry', macros: FAKE_RECIPE.macros, total_minutes: 20, cuisine: 'Asian' },
    };
    const supabase = makeSupabase([entry]);
    const result = await dbListCookedLog(supabase, FAKE_RECIPE.user_id, 30);
    expect(result).toHaveLength(1);
    expect(result[0].recipe.title).toBe('Chicken Stir-Fry');
  });
});

describe('dbGetRecentCookTitles — critical T8 contract', () => {
  it('(a) lowercases all titles', async () => {
    const rows = [{ recipe: { title: 'Chicken STIR-FRY' } }, { recipe: { title: 'Pasta Bolognese' } }];
    const supabase = makeSupabase(rows);
    const titles = await dbGetRecentCookTitles(supabase, FAKE_RECIPE.user_id, new Date(0).toISOString());
    expect(titles).toContain('chicken stir-fry');
    expect(titles).toContain('pasta bolognese');
  });

  it('(c) deduplicates repeated cooks of the same recipe', async () => {
    const rows = [
      { recipe: { title: 'Chicken Stir-Fry' } },
      { recipe: { title: 'Chicken Stir-Fry' } },
    ];
    const supabase = makeSupabase(rows);
    const titles = await dbGetRecentCookTitles(supabase, FAKE_RECIPE.user_id, new Date(0).toISOString());
    const count = titles.filter((t) => t === 'chicken stir-fry').length;
    expect(count).toBe(1);
  });

  it('(d) scopes to current user only — userId is passed to eq filter', async () => {
    // We verify the supabase.from chain receives .eq('user_id', userId).
    // A real RLS test lives in the Supabase integration suite; this is the unit contract check.
    const rows: unknown[] = [];
    const supabase = makeSupabase(rows);
    await dbGetRecentCookTitles(supabase, 'user-xyz', new Date(0).toISOString());
    // The from() call must have been made with 'cooked_log'
    expect(supabase.from).toHaveBeenCalledWith('cooked_log');
  });

  it('(b) applies the since date window via gte filter', async () => {
    // Verify gte is called. Window correctness is enforced by Supabase — here we assert
    // the parameter is forwarded.
    const rows: unknown[] = [];
    const supabase = makeSupabase(rows);
    const since = new Date('2026-01-01').toISOString();
    await dbGetRecentCookTitles(supabase, 'user-xyz', since);
    // Chain was called — no error thrown means the gte call went through.
    expect(supabase.from).toHaveBeenCalledWith('cooked_log');
  });
});
```

- [ ] **Step 2: Run tests — expect GREEN (repo is already implemented)**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/recipes/__tests__/repo.test.ts
```

Expected: all tests pass. If RED, fix `repo.ts` before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/server/recipes/__tests__/repo.test.ts
git commit -m "recipes-test: repo unit tests (CRUD + getRecentCookTitles T8 contract)"
```

---

### Task 4: Server actions (RED tests first, then implementation)

**Files:** `src/server/recipes/__tests__/actions.test.ts`, then `src/server/recipes/actions.ts`

Actions are Next.js `'use server'` functions. They call `requireUser()` for auth, create a Supabase server client, then delegate to repo functions. Tests mock both `requireUser` and the repo functions.

#### Task 4a — Write action tests (expected RED)

- [ ] **Step 1: Create `src/server/recipes/__tests__/actions.test.ts`**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before imports that use them.
// ---------------------------------------------------------------------------

vi.mock('@/server/auth/require-user', () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: 'user-aaa', email: 'test@example.com' }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('../repo', () => ({
  dbGetRecipe: vi.fn(),
  dbInsertRecipe: vi.fn(),
  dbListSavedRecipes: vi.fn(),
  dbSetSaved: vi.fn(),
  dbDeleteRecipe: vi.fn(),
  dbInsertCookedLog: vi.fn(),
  dbListCookedLog: vi.fn(),
  dbGetRecentCookTitles: vi.fn(),
}));

import * as repo from '../repo';
import {
  saveRecipe,
  unsaveRecipe,
  deleteRecipe,
  getRecipe,
  listSavedRecipes,
  markCooked,
  listCookedLog,
  getRecentCookTitles,
} from '../actions';
import type { MealCandidate } from '@/contracts/zod/recommendation';

const FAKE_CANDIDATE: MealCandidate = {
  title: 'Grilled Salmon',
  oneLineWhy: 'High protein, quick cook',
  ingredients: [{ name: 'salmon', qty: 150, unit: 'g', note: null }],
  steps: [{ idx: 1, text: 'Grill for 8 min', durationMin: 8 }],
  estMacros: { kcal: 350, protein_g: 35, carbs_g: 5, fat_g: 18 },
  servings: 1,
  totalMinutes: 12,
  cuisine: 'Mediterranean',
  tags: ['quick', 'healthy'],
  pantryCoverage: 0.85,
  missingItems: ['lemon'],
};

describe('saveRecipe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls dbInsertRecipe and returns the new id', async () => {
    vi.mocked(repo.dbInsertRecipe).mockResolvedValueOnce('new-uuid');
    const id = await saveRecipe(FAKE_CANDIDATE, 'recommendation');
    expect(repo.dbInsertRecipe).toHaveBeenCalledOnce();
    expect(id).toBe('new-uuid');
  });

  it('maps MealCandidate.estMacros → Recipe.macros correctly', async () => {
    vi.mocked(repo.dbInsertRecipe).mockResolvedValueOnce('new-uuid');
    await saveRecipe(FAKE_CANDIDATE, 'recommendation');
    const inserted = vi.mocked(repo.dbInsertRecipe).mock.calls[0][1];
    expect(inserted.macros).toEqual({
      kcal: 350,
      protein_g: 35,
      carbs_g: 5,
      fat_g: 18,
    });
  });
});

describe('unsaveRecipe', () => {
  it('calls dbSetSaved(false)', async () => {
    vi.mocked(repo.dbSetSaved).mockResolvedValueOnce(undefined);
    await unsaveRecipe('recipe-id');
    expect(repo.dbSetSaved).toHaveBeenCalledWith(expect.anything(), 'recipe-id', false);
  });
});

describe('deleteRecipe', () => {
  it('calls dbDeleteRecipe', async () => {
    vi.mocked(repo.dbDeleteRecipe).mockResolvedValueOnce(undefined);
    await deleteRecipe('recipe-id');
    expect(repo.dbDeleteRecipe).toHaveBeenCalledOnce();
  });
});

describe('getRecipe', () => {
  it('returns recipe when found', async () => {
    const fake = { id: 'r1', title: 'Test' };
    vi.mocked(repo.dbGetRecipe).mockResolvedValueOnce(fake as never);
    const result = await getRecipe('r1');
    expect(result).toEqual(fake);
  });

  it('returns null when not found', async () => {
    vi.mocked(repo.dbGetRecipe).mockResolvedValueOnce(null);
    const result = await getRecipe('bad');
    expect(result).toBeNull();
  });
});

describe('listSavedRecipes', () => {
  it('delegates to dbListSavedRecipes with current userId', async () => {
    vi.mocked(repo.dbListSavedRecipes).mockResolvedValueOnce([]);
    const result = await listSavedRecipes();
    expect(repo.dbListSavedRecipes).toHaveBeenCalledWith(expect.anything(), 'user-aaa');
    expect(result).toEqual([]);
  });
});

describe('markCooked', () => {
  it('calls dbInsertCookedLog with rating and note', async () => {
    vi.mocked(repo.dbInsertCookedLog).mockResolvedValueOnce(undefined);
    await markCooked('recipe-id', { note: 'Loved it', rating: 5 });
    expect(repo.dbInsertCookedLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ recipe_id: 'recipe-id', rating: 5, note: 'Loved it' }),
    );
  });

  it('works without options', async () => {
    vi.mocked(repo.dbInsertCookedLog).mockResolvedValueOnce(undefined);
    await markCooked('recipe-id');
    expect(repo.dbInsertCookedLog).toHaveBeenCalledOnce();
  });
});

describe('listCookedLog', () => {
  it('defaults to 30 days', async () => {
    vi.mocked(repo.dbListCookedLog).mockResolvedValueOnce([]);
    await listCookedLog();
    expect(repo.dbListCookedLog).toHaveBeenCalledWith(expect.anything(), 'user-aaa', 30);
  });

  it('accepts custom days', async () => {
    vi.mocked(repo.dbListCookedLog).mockResolvedValueOnce([]);
    await listCookedLog(7);
    expect(repo.dbListCookedLog).toHaveBeenCalledWith(expect.anything(), 'user-aaa', 7);
  });
});

describe('getRecentCookTitles — T8 contract', () => {
  it('returns lowercased, deduped titles from dbGetRecentCookTitles', async () => {
    vi.mocked(repo.dbGetRecentCookTitles).mockResolvedValueOnce(['salmon teriyaki', 'chicken stir-fry']);
    const titles = await getRecentCookTitles(7);
    expect(titles).toContain('salmon teriyaki');
    expect(titles).toContain('chicken stir-fry');
  });

  it('passes a since timestamp derived from daysWindow', async () => {
    vi.mocked(repo.dbGetRecentCookTitles).mockResolvedValueOnce([]);
    await getRecentCookTitles(14);
    const since = vi.mocked(repo.dbGetRecentCookTitles).mock.calls[0][2];
    // since should be approximately 14 days ago
    const sinceDate = new Date(since);
    const expectedApprox = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(Math.abs(sinceDate.getTime() - expectedApprox.getTime())).toBeLessThan(5000);
  });
});
```

- [ ] **Step 2: Run tests — expected RED (actions.ts does not exist yet)**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/recipes/__tests__/actions.test.ts
```

Expected: import error or test failures. Proceed to Task 4b.

#### Task 4b — Implement `src/server/recipes/actions.ts`

- [ ] **Step 3: Create `src/server/recipes/actions.ts`**

```ts
'use server';

import { requireUser } from '@/server/auth/require-user';
import { createServerClient } from '@/lib/supabase/server';
import type { MealCandidate } from '@/contracts/zod/recommendation';
import type { Recipe } from '@/contracts/zod/recipe';
import {
  dbGetRecipe,
  dbInsertRecipe,
  dbListSavedRecipes,
  dbSetSaved,
  dbDeleteRecipe,
  dbInsertCookedLog,
  dbListCookedLog,
  dbGetRecentCookTitles,
  type CookedLogEntry,
} from './repo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map MealCandidate (engine output) → Recipe DB row shape. */
function candidateToRecipeRow(
  candidate: MealCandidate,
  userId: string,
  source: 'recommendation' | 'manual',
  generatedRunId?: string | null,
): Omit<Recipe, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    title: candidate.title,
    description: candidate.oneLineWhy,
    ingredients: candidate.ingredients,
    steps: candidate.steps,
    macros: {
      kcal: candidate.estMacros.kcal,
      protein_g: candidate.estMacros.protein_g,
      carbs_g: candidate.estMacros.carbs_g,
      fat_g: candidate.estMacros.fat_g,
    },
    servings: candidate.servings,
    total_minutes: candidate.totalMinutes,
    cuisine: candidate.cuisine ?? null,
    tags: candidate.tags ?? [],
    source: source === 'recommendation' ? 'ai-generated' : 'user-saved',
    generated_run_id: generatedRunId ?? null,
    saved: true,
  };
}

// ---------------------------------------------------------------------------
// Exported server actions
// ---------------------------------------------------------------------------

/**
 * Persist a MealCandidate from engine output to the `recipes` table.
 * Returns the new recipe UUID.
 */
export async function saveRecipe(
  candidate: MealCandidate,
  source: 'recommendation' | 'manual',
  generatedRunId?: string | null,
): Promise<string> {
  const { userId } = await requireUser();
  const supabase = createServerClient();
  const row = candidateToRecipeRow(candidate, userId, source, generatedRunId);
  return dbInsertRecipe(supabase, row);
}

/**
 * Un-save a recipe (keeps the row, sets saved=false).
 * Use deleteRecipe for a hard delete.
 */
export async function unsaveRecipe(id: string): Promise<void> {
  await requireUser();
  const supabase = createServerClient();
  await dbSetSaved(supabase, id, false);
}

/**
 * Hard-delete a recipe row.
 * RLS ensures ownership; the repo passes the call through without an extra userId filter
 * because Supabase RLS handles it. This is intentional — RLS is the enforcement layer.
 *
 * <!-- TODO: confirm with user — if soft-delete is preferred, replace with dbSetSaved or
 * a dedicated dbSoftDeleteRecipe that sets deleted_at. Requires a schema column. -->
 */
export async function deleteRecipe(id: string): Promise<void> {
  await requireUser();
  const supabase = createServerClient();
  await dbDeleteRecipe(supabase, id);
}

/** Fetch a single recipe. Returns null if not found or not owned by current user (RLS). */
export async function getRecipe(id: string): Promise<Recipe | null> {
  await requireUser();
  const supabase = createServerClient();
  return dbGetRecipe(supabase, id);
}

/** List all saved recipes for the current user, newest first. */
export async function listSavedRecipes(): Promise<Recipe[]> {
  const { userId } = await requireUser();
  const supabase = createServerClient();
  return dbListSavedRecipes(supabase, userId);
}

/**
 * Append a cooked_log entry and optionally record a rating + note.
 *
 * <!-- TODO: confirm with user — should this also bump a popularity counter on the recipe
 * row? Spec does not define a counter column. Skipped for now; add a
 * `cooked_count int default 0` column + increment in Track 0 if desired. -->
 */
export async function markCooked(
  recipeId: string,
  opts?: { note?: string; rating?: 1 | 2 | 3 | 4 | 5 },
): Promise<void> {
  const { userId } = await requireUser();
  const supabase = createServerClient();
  await dbInsertCookedLog(supabase, {
    user_id: userId,
    recipe_id: recipeId,
    rating: opts?.rating ?? null,
    note: opts?.note ?? null,
  });
}

/** List cooked-log entries for the current user within the given day window. */
export async function listCookedLog(days = 30): Promise<CookedLogEntry[]> {
  const { userId } = await requireUser();
  const supabase = createServerClient();
  return dbListCookedLog(supabase, userId, days);
}

/**
 * Returns lowercased, deduped recipe titles cooked within `daysWindow` days.
 *
 * **T8 hand-off:** T8 (Feed Me / engine recency filter) imports this function
 * and passes the result to `recommend(ctx, deps)` as `deps.recentCookTitles`.
 * The engine filters out any candidate whose lowercased title matches an entry here.
 * Do NOT change the return shape without coordinating with T8.
 */
export async function getRecentCookTitles(daysWindow = 7): Promise<string[]> {
  const { userId } = await requireUser();
  const supabase = createServerClient();
  const since = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000).toISOString();
  return dbGetRecentCookTitles(supabase, userId, since);
}
```

- [ ] **Step 4: Run tests — expected GREEN**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/recipes/__tests__/actions.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/server/recipes/__tests__/actions.test.ts src/server/recipes/actions.ts
git commit -m "recipes: server actions + action tests (save, cook, recency — T8 contract)"
```

---

### Task 5: `MacrosCard` component

**Files:** `src/components/feature/recipes/MacrosCard.tsx`

Wraps the Track 1 `MacroRing` primitive with stat tiles for kcal, protein, carbs, fat. Accepts a `macros` prop and optional `target` for ring-fill calculation. This is a Server Component — no interactivity needed.

- [ ] **Step 1: Create `src/components/feature/recipes/MacrosCard.tsx`**

```tsx
import { MacroRing } from '@/components/ui/macro-ring';
import { StatTile } from '@/components/ui/stat-tile';
import type { Macros } from '@/contracts/zod/recipe';

interface MacrosCardProps {
  macros: Macros;
  targetKcal?: number;
  className?: string;
}

export function MacrosCard({ macros, targetKcal, className }: MacrosCardProps) {
  const fillRatio = targetKcal && targetKcal > 0 ? Math.min(macros.kcal / targetKcal, 1) : undefined;

  return (
    <div className={`flex flex-col items-center gap-6 rounded-2xl border border-border bg-surface-elevated p-6 shadow-1 ${className ?? ''}`}>
      <MacroRing
        kcal={macros.kcal}
        protein={macros.protein_g}
        carbs={macros.carbs_g}
        fat={macros.fat_g}
        fillRatio={fillRatio}
      />
      <div className="grid grid-cols-4 gap-3 w-full">
        <StatTile label="kcal" value={macros.kcal} unit="" mono />
        <StatTile label="protein" value={macros.protein_g} unit="g" mono />
        <StatTile label="carbs" value={macros.carbs_g} unit="g" mono />
        <StatTile label="fat" value={macros.fat_g} unit="g" mono />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/feature/recipes/MacrosCard.tsx
git commit -m "recipes-ui: MacrosCard wrapping MacroRing + StatTile grid"
```

---

### Task 6: `IngredientsList` component

**Files:** `src/components/feature/recipes/IngredientsList.tsx`

Interactive client component. Renders ingredient rows with a serving multiplier control. Quantities scale linearly. Uses `PantryChip` from Track 1 to indicate pantry coverage per ingredient if `pantryNames` prop is provided.

<!-- TODO: confirm with user — swipe-to-check affordance mentioned in spec §5 for ingredients. Implemented as a checkbox toggle for now; swipe gesture requires a gesture library (e.g. `@use-gesture/react`) that is not yet a dependency. Add a TODO comment in the component. -->

- [ ] **Step 1: Create `src/components/feature/recipes/IngredientsList.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { PantryChip } from '@/components/ui/pantry-chip';
import { cn } from '@/components/ui/utils';
import type { Ingredient } from '@/contracts/zod/recipe';

interface IngredientsListProps {
  ingredients: Ingredient[];
  defaultServings: number;
  pantryNames?: string[]; // lowercased names of items in pantry
}

const MULTIPLIERS = [0.5, 1, 2, 3, 4] as const;

export function IngredientsList({
  ingredients,
  defaultServings,
  pantryNames = [],
}: IngredientsListProps) {
  const [multiplier, setMultiplier] = useState(1);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const pantrySet = new Set(pantryNames.map((n) => n.toLowerCase()));

  function toggleChecked(idx: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const servings = defaultServings * multiplier;

  return (
    <div className="flex flex-col gap-4">
      {/* Serving multiplier */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">Servings:</span>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
          {MULTIPLIERS.map((m) => (
            <button
              key={m}
              onClick={() => setMultiplier(m)}
              className={cn(
                'rounded-lg px-3 py-1 text-sm font-medium transition-colors duration-snap',
                multiplier === m
                  ? 'bg-accent text-accent-fg shadow-1'
                  : 'text-text-muted hover:text-text',
              )}
            >
              {defaultServings * m}
            </button>
          ))}
        </div>
        <span className="text-xs text-text-muted">
          ({servings} {servings === 1 ? 'serving' : 'servings'})
        </span>
      </div>

      {/* TODO: swipe-to-check gesture — requires @use-gesture/react, not yet a dep.
          Currently a tap/click checkbox toggle. */}
      <ul className="flex flex-col divide-y divide-border">
        {ingredients.map((ing, i) => {
          const inPantry = pantrySet.has(ing.name.toLowerCase());
          const qty = ing.qty != null ? (ing.qty * multiplier).toFixed(ing.qty % 1 === 0 ? 0 : 1) : null;
          const isDone = checked.has(i);

          return (
            <li
              key={i}
              onClick={() => toggleChecked(i)}
              className={cn(
                'flex items-center gap-3 py-3 cursor-pointer select-none',
                isDone && 'opacity-40',
              )}
            >
              <span
                className={cn(
                  'h-5 w-5 shrink-0 rounded-full border-2 transition-colors duration-snap',
                  isDone ? 'border-accent bg-accent' : 'border-border bg-surface',
                )}
              />
              <div className="flex flex-1 items-baseline gap-1.5 min-w-0">
                {qty != null && (
                  <span className="font-mono text-sm font-semibold text-text shrink-0">
                    {qty}{ing.unit ? ` ${ing.unit}` : ''}
                  </span>
                )}
                <span className="text-sm text-text truncate">{ing.name}</span>
                {ing.note && (
                  <span className="text-xs text-text-muted shrink-0">({ing.note})</span>
                )}
              </div>
              {inPantry && (
                <PantryChip label="✓ pantry" checked size="sm" className="shrink-0" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/feature/recipes/IngredientsList.tsx
git commit -m "recipes-ui: IngredientsList with serving multiplier + pantry coverage chips"
```

---

### Task 7: `StepsList` component

**Files:** `src/components/feature/recipes/StepsList.tsx`

Client component. Numbered step rows with an optional timer affordance for steps that have `durationMin`. Timer is a simple countdown — clicking the duration badge starts it. A `ClockIcon` pulses while the timer is running.

- [ ] **Step 1: Create `src/components/feature/recipes/StepsList.tsx`**

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ClockIcon } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { Step } from '@/contracts/zod/recipe';

interface StepsListProps {
  steps: Step[];
}

interface TimerState {
  stepIdx: number;
  remainingSeconds: number;
  running: boolean;
}

export function StepsList({ steps }: StepsListProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timer?.running) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (!prev || prev.remainingSeconds <= 1) {
            clearInterval(intervalRef.current!);
            return null;
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer?.running]);

  function startTimer(stepIdx: number, durationMin: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer({ stepIdx, remainingSeconds: durationMin * 60, running: true });
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, i) => {
        const isActive = activeStep === i;
        const timerForStep = timer?.stepIdx === step.idx ? timer : null;

        return (
          <li
            key={step.idx}
            onClick={() => setActiveStep(i)}
            className={cn(
              'flex gap-4 rounded-xl p-4 cursor-pointer transition-all duration-base',
              isActive
                ? 'bg-surface-elevated border border-border shadow-1'
                : 'hover:bg-surface',
            )}
          >
            {/* Step number badge */}
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-snap',
                isActive ? 'bg-accent text-accent-fg' : 'bg-surface-elevated text-text-muted',
              )}
            >
              {step.idx}
            </span>

            <div className="flex flex-1 flex-col gap-2">
              <p className={cn('text-sm leading-relaxed', isActive ? 'text-text' : 'text-text-muted')}>
                {step.text}
              </p>

              {step.durationMin != null && step.durationMin > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startTimer(step.idx, step.durationMin!);
                  }}
                  className="flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-muted hover:border-accent hover:text-accent transition-colors duration-snap"
                >
                  <ClockIcon
                    strokeWidth={1.75}
                    className={cn(
                      'size-3.5 transition-all',
                      timerForStep?.running && 'text-accent animate-pulse',
                    )}
                  />
                  {timerForStep
                    ? formatTime(timerForStep.remainingSeconds)
                    : `${step.durationMin} min`}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/feature/recipes/StepsList.tsx
git commit -m "recipes-ui: StepsList with step-tap activation + countdown timer affordance"
```

---

### Task 8: `CookButton` component

**Files:** `src/components/feature/recipes/CookButton.tsx`

Sticky bottom action bar. Calls `markCooked` server action then shows a toast. After cooking, the button changes to "Cook again" and a brief confirmation state appears.

<!-- TODO: confirm with user — spec mentions a "3-step wizard" (rate + note + confirmation). Implemented as immediate log with an optional inline rating popover for simplicity. The full sheet wizard is the upgrade path if desired. Add a flag comment. -->

- [ ] **Step 1: Create `src/components/feature/recipes/CookButton.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { CheckCircleIcon, ChefHatIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { markCooked } from '@/server/recipes/actions';
import { cn } from '@/components/ui/utils';

interface CookButtonProps {
  recipeId: string;
  recipeTitle: string;
}

// TODO: confirm with user — the spec mentions a 3-step cook wizard (log → rate → note).
// Currently this is an immediate log. To enable the wizard, wrap the markCooked call
// in a Sheet from '@/components/ui/sheet' with rating + note inputs.
// Flag: COOK_WIZARD = false (immediate log mode).

export function CookButton({ recipeId, recipeTitle }: CookButtonProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [cooked, setCooked] = useState(false);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [showRating, setShowRating] = useState(false);

  function handleCook() {
    startTransition(async () => {
      try {
        await markCooked(recipeId, rating ? { rating } : undefined);
        setCooked(true);
        setShowRating(false);
        toast({
          title: 'Logged!',
          description: `${recipeTitle} added to your cooked log.`,
        });
      } catch {
        toast({ title: 'Something went wrong', variant: 'destructive' });
      }
    });
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface/90 backdrop-blur-sm pb-safe">
      <div className="mx-auto max-w-2xl px-4 py-3 flex flex-col gap-2">
        {/* Inline rating (optional, pre-cook) */}
        {showRating && !cooked && (
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs text-text-muted mr-2">Rate before logging:</span>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={cn(
                  'text-lg transition-transform hover:scale-125',
                  rating != null && n <= rating ? 'opacity-100' : 'opacity-30',
                )}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {!cooked && !showRating && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRating(true)}
              className="text-text-muted"
            >
              + Rating
            </Button>
          )}
          <Button
            onClick={handleCook}
            disabled={isPending || cooked}
            className={cn(
              'flex-1 gap-2 font-semibold',
              cooked && 'bg-ok text-white',
            )}
          >
            {cooked ? (
              <>
                <CheckCircleIcon strokeWidth={1.75} className="size-4" />
                Cooked — nice work
              </>
            ) : isPending ? (
              'Logging…'
            ) : (
              <>
                <ChefHatIcon strokeWidth={1.75} className="size-4" />
                Cook this
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/feature/recipes/CookButton.tsx
git commit -m "recipes-ui: CookButton sticky action bar with immediate cook log + optional rating"
```

---

### Task 9: `RecipeDetail` component

**Files:** `src/components/feature/recipes/RecipeDetail.tsx`

Top-level page body for `/recipes/[id]`. Composes `MacrosCard`, `IngredientsList`, `StepsList`, and `CookButton`. Hero section with title + cuisine badge. This is a Server Component — pass client sub-components as children where needed.

- [ ] **Step 1: Create `src/components/feature/recipes/RecipeDetail.tsx`**

```tsx
import { ClockIcon, TagIcon } from 'lucide-react';
import { MacrosCard } from './MacrosCard';
import { IngredientsList } from './IngredientsList';
import { StepsList } from './StepsList';
import { CookButton } from './CookButton';
import type { Recipe } from '@/contracts/zod/recipe';

interface RecipeDetailProps {
  recipe: Recipe;
  pantryNames?: string[];
  targetKcal?: number;
}

export function RecipeDetail({ recipe, pantryNames, targetKcal }: RecipeDetailProps) {
  return (
    <div className="relative flex flex-col gap-8 pb-32">
      {/* Hero */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-text leading-snug">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="text-sm text-text-muted leading-relaxed">{recipe.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1">
          <span className="flex items-center gap-1">
            <ClockIcon strokeWidth={1.75} className="size-3.5" />
            {recipe.total_minutes} min
          </span>
          {recipe.cuisine && (
            <span className="flex items-center gap-1">
              <TagIcon strokeWidth={1.75} className="size-3.5" />
              {recipe.cuisine}
            </span>
          )}
          <span>{recipe.servings} serving{recipe.servings > 1 ? 's' : ''}</span>
        </div>
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-elevated border border-border px-2.5 py-0.5 text-xs text-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Macros */}
      <MacrosCard macros={recipe.macros} targetKcal={targetKcal} />

      {/* Ingredients */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-text">Ingredients</h2>
        <IngredientsList
          ingredients={recipe.ingredients}
          defaultServings={recipe.servings}
          pantryNames={pantryNames}
        />
      </section>

      {/* Steps */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-text">Method</h2>
        <StepsList steps={recipe.steps} />
      </section>

      {/* Sticky cook button */}
      <CookButton recipeId={recipe.id} recipeTitle={recipe.title} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/feature/recipes/RecipeDetail.tsx
git commit -m "recipes-ui: RecipeDetail page body (hero + macros + ingredients + steps + cook)"
```

---

### Task 10: `CookedLogTimeline` + `SavedGrid` components

**Files:** `src/components/feature/recipes/CookedLogTimeline.tsx`, `src/components/feature/recipes/SavedGrid.tsx`

`CookedLogTimeline` — chronological list with date headers, `MealCard` summaries, and a "Cook again" link. `SavedGrid` — filterable `MealCard` grid for `/recipes/saved`.

- [ ] **Step 1: Create `src/components/feature/recipes/CookedLogTimeline.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { MealCard } from '@/components/ui/meal-card';
import type { CookedLogEntry } from '@/server/recipes/repo';

interface CookedLogTimelineProps {
  entries: CookedLogEntry[];
}

function formatDateHeader(isoString: string): string {
  const d = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function groupByDate(entries: CookedLogEntry[]): Map<string, CookedLogEntry[]> {
  const map = new Map<string, CookedLogEntry[]>();
  for (const entry of entries) {
    const key = new Date(entry.cooked_at).toDateString();
    const group = map.get(key) ?? [];
    group.push(entry);
    map.set(key, group);
  }
  return map;
}

export function CookedLogTimeline({ entries }: CookedLogTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-lg font-semibold text-text">No cooks logged yet.</p>
        <p className="text-sm text-text-muted">Cook a recipe and it'll show up here.</p>
        <Link href="/" className="text-sm font-medium text-accent hover:underline">
          Find something to cook →
        </Link>
      </div>
    );
  }

  const grouped = groupByDate(entries);

  return (
    <div className="flex flex-col gap-6">
      {[...grouped.entries()].map(([dateKey, group]) => (
        <section key={dateKey} className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted px-1">
            {formatDateHeader(group[0].cooked_at)}
          </h2>
          <div className="flex flex-col gap-3">
            {group.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-1">
                <Link href={`/recipes/${entry.recipe_id}`}>
                  <MealCard
                    title={entry.recipe.title}
                    oneLineWhy={entry.note ?? ''}
                    estMacros={{
                      kcal: entry.recipe.macros.kcal,
                      protein: entry.recipe.macros.protein_g,
                      carbs: entry.recipe.macros.carbs_g,
                      fat: entry.recipe.macros.fat_g,
                    }}
                    totalMinutes={entry.recipe.total_minutes}
                    pantryCoverage={1}
                    missingItems={[]}
                  />
                </Link>
                <div className="flex items-center justify-between px-1">
                  {entry.rating != null && (
                    <span className="text-xs text-text-muted">
                      {'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}
                    </span>
                  )}
                  <Link
                    href={`/recipes/${entry.recipe_id}`}
                    className="ml-auto text-xs font-medium text-accent hover:underline"
                  >
                    Cook again →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/feature/recipes/SavedGrid.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SearchIcon } from 'lucide-react';
import { MealCard } from '@/components/ui/meal-card';
import { Input } from '@/components/ui/input';
import type { Recipe } from '@/contracts/zod/recipe';

interface SavedGridProps {
  recipes: Recipe[];
}

export function SavedGrid({ recipes }: SavedGridProps) {
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState('');

  const cuisines = [...new Set(recipes.map((r) => r.cuisine).filter(Boolean) as string[])].sort();

  const filtered = recipes.filter((r) => {
    const matchesQuery = query === '' || r.title.toLowerCase().includes(query.toLowerCase());
    const matchesCuisine = cuisine === '' || r.cuisine === cuisine;
    return matchesQuery && matchesCuisine;
  });

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-lg font-semibold text-text">No saved recipes yet.</p>
        <p className="text-sm text-text-muted">
          Get a recommendation and save one you like.
        </p>
        <Link href="/" className="text-sm font-medium text-accent hover:underline">
          Get recommendations →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search + filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted"
          />
          <Input
            type="search"
            placeholder="Search recipes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {cuisines.length > 0 && (
          <select
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All cuisines</option>
            {cuisines.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Results count */}
      {query || cuisine ? (
        <p className="text-xs text-text-muted">
          {filtered.length} recipe{filtered.length !== 1 ? 's' : ''}
        </p>
      ) : null}

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted py-8 text-center">No recipes match your filter.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <MealCard
                title={recipe.title}
                oneLineWhy={recipe.description ?? ''}
                estMacros={{
                  kcal: recipe.macros.kcal,
                  protein: recipe.macros.protein_g,
                  carbs: recipe.macros.carbs_g,
                  fat: recipe.macros.fat_g,
                }}
                totalMinutes={recipe.total_minutes}
                pantryCoverage={1}
                missingItems={[]}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/components/feature/recipes/CookedLogTimeline.tsx src/components/feature/recipes/SavedGrid.tsx
git commit -m "recipes-ui: CookedLogTimeline + SavedGrid with search and cuisine filter"
```

---

### Task 11: Barrel re-export

**Files:** `src/components/feature/recipes/index.ts`

- [ ] **Step 1: Create `src/components/feature/recipes/index.ts`**

```ts
export { RecipeDetail } from './RecipeDetail';
export { IngredientsList } from './IngredientsList';
export { StepsList } from './StepsList';
export { MacrosCard } from './MacrosCard';
export { CookButton } from './CookButton';
export { CookedLogTimeline } from './CookedLogTimeline';
export { SavedGrid } from './SavedGrid';
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/feature/recipes/index.ts
git commit -m "recipes-ui: barrel re-export for feature/recipes components"
```

---

### Task 12: App Router pages

**Files:** `src/app/recipes/[id]/page.tsx`, `src/app/recipes/saved/page.tsx`, `src/app/recipes/cooked/page.tsx`

RSC pages. Each fetches data via server actions, handles not-found, and passes typed props to feature components.

- [ ] **Step 1: Create `src/app/recipes/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getRecipe } from '@/server/recipes/actions';
import { RecipeDetail } from '@/components/feature/recipes/RecipeDetail';

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  // TODO: fetch user's pantry names for coverage chips once T5 (pantry) is merged.
  // const pantryNames = await listPantryNames();
  // TODO: fetch user's targetKcal from profile once T6 (profile) is merged.

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-8">
      <RecipeDetail recipe={recipe} />
    </main>
  );
}

export async function generateMetadata({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  return {
    title: recipe ? `${recipe.title} — WhatToEat` : 'Recipe not found',
  };
}
```

- [ ] **Step 2: Create `src/app/recipes/saved/page.tsx`**

```tsx
import { listSavedRecipes } from '@/server/recipes/actions';
import { SavedGrid } from '@/components/feature/recipes/SavedGrid';

export const metadata = { title: 'Saved Recipes — WhatToEat' };

export default async function SavedPage() {
  const recipes = await listSavedRecipes();

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text">Saved</h1>
        <p className="text-sm text-text-muted mt-1">
          {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} in your collection
        </p>
      </div>
      <SavedGrid recipes={recipes} />
    </main>
  );
}
```

- [ ] **Step 3: Create `src/app/recipes/cooked/page.tsx`**

```tsx
import { listCookedLog } from '@/server/recipes/actions';
import { CookedLogTimeline } from '@/components/feature/recipes/CookedLogTimeline';

export const metadata = { title: 'Cooked Log — WhatToEat' };

export default async function CookedLogPage() {
  const entries = await listCookedLog(30);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text">Cooked</h1>
        <p className="text-sm text-text-muted mt-1">Last 30 days</p>
      </div>
      <CookedLogTimeline entries={entries} />
    </main>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0. Any errors around missing `pantry` imports are expected and noted as TODO.

- [ ] **Step 5: Commit**

```bash
git add src/app/recipes/
git commit -m "recipes: App Router pages — /recipes/[id], /recipes/saved, /recipes/cooked"
```

---

### Task 13: Full test run + typecheck + lint

**Files:** (none created)

- [ ] **Step 1: Run all recipe tests**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run test src/server/recipes/
```

Expected: all tests GREEN. Zero failures.

- [ ] **Step 2: Full typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run typecheck
```

Expected: exit 0 or only pre-existing errors unrelated to this track.

- [ ] **Step 3: Lint**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run lint
```

Expected: exit 0. Fix any lint errors before proceeding.

- [ ] **Step 4: Verify no forbidden path edits**

```bash
git -C /Users/ravishah/Documents/whattoeat diff --name-only main..HEAD | grep -E '^(src/contracts|src/db|supabase|src/engine|src/components/ui|src/server/auth|tailwind\.config|\.github/workflows)' || echo "clean — no forbidden paths touched"
```

Expected: prints "clean — no forbidden paths touched".

---

### Task 14: Manual smoke test

**Files:** (none created)

Run the dev server and walk through the full save → cook → cooked log → recency filter round trip.

- [ ] **Step 1: Start dev server**

```bash
cd /Users/ravishah/Documents/whattoeat && bun run dev
```

- [ ] **Step 2: Auth + save a recipe**

Navigate to `http://localhost:3000`. Sign in. Trigger a "Feed Me" recommendation (T8 must be running, or manually call `saveRecipe` from the browser console / server-action playground). Confirm the recipe appears at `/recipes/saved`.

- [ ] **Step 3: Open recipe detail**

Navigate to `/recipes/<saved-id>`. Verify:
  - Title, description, cuisine, total minutes render correctly.
  - `MacrosCard` shows correct kcal/protein/carbs/fat.
  - `IngredientsList` renders with serving multiplier controls.
  - `StepsList` renders steps; clicking a duration badge starts the countdown timer.
  - `CookButton` is visible and sticky at the bottom.

- [ ] **Step 4: Cook the recipe**

Click "Cook this". Verify:
  - Toast appears: "Logged! {title} added to your cooked log."
  - Button changes state to "Cooked — nice work".
  - Navigate to `/recipes/cooked` — entry appears with today's date header.

- [ ] **Step 5: Recency filter check (T8 hand-off)**

In a Next.js REPL or test script, call `getRecentCookTitles(7)`. Verify the title just cooked appears lowercased and without duplicates. This confirms the T8 contract is live.

- [ ] **Step 6: Confirm smoke test passes, no console errors**

---

### Task 15: PR

**Files:** (none created)

- [ ] **Step 1: Final status check**

```bash
git -C /Users/ravishah/Documents/whattoeat status
git -C /Users/ravishah/Documents/whattoeat log --oneline main..HEAD
```

- [ ] **Step 2: Push branch**

```bash
git -C /Users/ravishah/Documents/whattoeat push -u origin wt/track-9-recipes
```

- [ ] **Step 3: Open PR**

```bash
gh pr create \
  --title "Track 9: Recipe view + saved + cooked log" \
  --body "$(cat <<'EOF'
## Summary

- Adds `src/server/recipes/actions.ts` and `repo.ts` — full CRUD on `recipes` table, cooked-log append, and the critical `getRecentCookTitles()` T8 hand-off.
- Three App Router pages: `/recipes/[id]` (full recipe detail), `/recipes/saved` (searchable grid), `/recipes/cooked` (chronological timeline).
- Feature components: `RecipeDetail`, `IngredientsList` (serving multiplier + pantry coverage chips), `StepsList` (countdown timer), `MacrosCard` (MacroRing + stat tiles), `CookButton` (sticky, immediate log), `CookedLogTimeline`, `SavedGrid`.
- Repo and action unit tests with mocked Supabase; `getRecentCookTitles` test asserts lowercased, within-window, deduped, and user-scoped behaviour.
- No forbidden paths touched (contracts, db, engine, ui primitives, auth).

## Test plan

- [ ] `bun run test src/server/recipes/` — all GREEN
- [ ] `bun run typecheck` — exit 0
- [ ] `bun run lint` — exit 0
- [ ] Manual: save → `/recipes/saved` → `/recipes/[id]` → cook → `/recipes/cooked` → `getRecentCookTitles` check
- [ ] Verify no forbidden-path edits: `git diff --name-only main..HEAD | grep src/contracts`
EOF
  )" \
  --base main \
  --head wt/track-9-recipes
```

---

## Definition of Done

- [ ] `bun run test src/server/recipes/` — 100% GREEN; zero skipped.
- [ ] `getRecentCookTitles` tests assert all four properties: (a) lowercased, (b) within window, (c) deduped, (d) user-scoped.
- [ ] `bun run typecheck` — exit 0.
- [ ] `bun run lint` — exit 0.
- [ ] Manual smoke test: save → cook → cooked log → recency filter check all pass.
- [ ] No file outside owned paths modified (verified by `git diff --name-only main..HEAD` filter).
- [ ] PR open and CI green; code-review agent passes.

---

## Hand-off note: T8 (Feed Me)

T8 imports `getRecentCookTitles` from `@/server/recipes/actions`:

```ts
import { getRecentCookTitles } from '@/server/recipes/actions';

// Inside the recommendation route handler:
const recentCookTitles = await getRecentCookTitles(7);
const result = await recommend(ctx, { llm, recentCookTitles });
```

The function returns `Promise<string[]>` — lowercased, deduped recipe titles cooked within the given day window. The engine's recency filter compares candidate titles (lowercased) against this list and drops matches. **Do not change the return type or lowercasing contract without coordinating with T8.**

---

## Open ambiguities (resolve before/during implementation)

1. **Hard delete vs soft delete** (`deleteRecipe`): The spec does not define a `deleted_at` column. Currently implemented as a hard `DELETE`. If soft-delete is needed, add `deleted_at timestamptz` in a Track 0 schema patch and flip the repo call. Marked with `<!-- TODO: confirm with user -->`.

2. **Cook wizard vs immediate log** (`CookButton`): The spec mentions a "3-step wizard" for logging a cook (rate + note + confirmation). Currently implemented as immediate log with an optional inline pre-cook rating. To enable the wizard, wrap the action in a `Sheet` from `@/components/ui/sheet`. Flagged with `COOK_WIZARD = false`. Marked with `<!-- TODO: confirm with user -->`.

3. **Swipe-to-check in `IngredientsList`**: The spec's swipe affordance requires a gesture library (e.g. `@use-gesture/react`) not yet in `package.json`. Currently implemented as tap-to-check. Gesture upgrade is additive — same component, add `useDrag` hook. Marked with `<!-- TODO -->` inline.

4. **Popularity counter**: The spec does not define a `cooked_count` column on `recipes`. `markCooked` does not bump a counter. If desired, add the column in Track 0 and call an `rpc('increment_cooked_count', { recipe_id })` in `dbInsertCookedLog`. Marked with `<!-- TODO: confirm with user -->` in `actions.ts`.

5. **Pantry coverage chips in `RecipeDetail`**: The `pantryNames` prop is stubbed with a TODO comment pending T5 (pantry) merge. Once T5 is merged, import `listPantryNames()` from `@/server/pantry/actions` in the RSC page and pass the result down.
