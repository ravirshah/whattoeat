<!-- AUTO-GENERATED from docs/PROJECT_RULES.md via scripts/sync-agent-rules.ts. Do not edit. -->

# Agent Bootstrap

You are working in the WhatToEat 2.0 repo.

**Before doing anything:**
1. Read `docs/PROJECT_RULES.md` (the rules below are a copy; the rules file is canonical).
2. Check the Cline Kanban at http://127.0.0.1:3484/whattoeat for an unclaimed Ready card matching the current wave.
3. If you have a card, run `/start-task` (Claude Code) or follow the equivalent worktree workflow.

The current spec is at `docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md`. The current implementation plans are under `docs/superpowers/plans/`.

---

# WhatToEat 2.0 — Project Rules

**Read this before doing anything.** Then check the kanban for an unclaimed Ready card.

## Mission

WhatToEat 2.0 is a personal meal-decision engine. Pantry + profile + daily check-in → recommended meals. Architected so future health signals (Apple Health, Eight Sleep, Superpower Labs) plug in as additional context.

## Architecture rule (non-negotiable)

Three layers, strict boundaries:

- **`src/engine/**`** — pure TypeScript. **No imports from `next`, `@supabase/*`, `drizzle-orm`, or any network/DB package.** Domain logic only.
- **`src/server/**`** — application services. Only place where DB, network, and engine meet.
- **`src/app/**`, `src/components/**`** — UI only. No business logic.

Violating this rule fails code review. The CI lints for forbidden imports.

## File-ownership rule (parallel-safe edits)

Every feature owns a folder slice across the layers — see the table in the spec section 6 (`docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md#6-parallelization--workflow`).

**No drive-by edits to shared files** (root layout, providers, tailwind config, tokens.css, `src/components/ui/*`) from a feature branch. If a feature needs a shared file changed, that's its own task on the kanban.

## Kanban + workflow

- Board: `http://127.0.0.1:3484/whattoeat`
- Lanes: `Backlog → Ready → In Progress → Review → Done`
- Pick the next Ready card matching the current wave. Read its acceptance criteria.

## Worktree workflow

```bash
./scripts/wt.sh new <track-name>
# creates ../whattoeat-<track-name> on a new branch wt/<track-name>
cd ../whattoeat-<track-name>
bun install
```

When done:

```bash
/finish-task   # runs typecheck/lint/tests + dispatches code-reviewer
```

## Definition of Done (per task)

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes
- [ ] No edits outside owned paths (per the file-ownership rule)
- [ ] `superpowers:code-reviewer` returns `pass` on the diff

## Forbidden patterns

- Raw hex/oklch in components — use tokens (`bg-surface`, `text-muted`, `rounded-lg`).
- Regex-parsing LLM output — use Zod + structured outputs.
- Drive-by edits to shared files from a feature branch.
- Schema changes outside Track 0 (DB schema is frozen as a contract).
- Imports of `next` / `@supabase/*` / `drizzle-orm` from `src/engine/**`.
- `console.log` left in code (Biome warns; remove or use the structured logger).

## Where to find things

- Spec: `docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md`
- Plans: `docs/superpowers/plans/`
- Frozen contracts: `src/contracts/zod/*`, `src/engine/ports/*`, `src/db/schema/*`
- Eval harness: `src/engine/eval/` (added in Plan 03)
- Kanban seed: `docs/superpowers/specs/kanban-tasks.yaml`

## Pre-push expectations

`bun run typecheck && bun run lint && bun run test` must all pass. The pre-push Husky hook enforces this; do not skip with `--no-verify`.

---

## Common Agent Mistakes

Patterns that have caused real bugs in this repo. Each agent starts cold — read
this section before touching code.

### 1. Migration numbering collisions

**Why:** Multiple worktrees branch off the same base (e.g. both off main which
had `0001_initial_schema`). Each agent creates `0002_*.sql` independently.

**Fix:** Before creating a migration, check what the highest-numbered file on
`main` is: `ls supabase/migrations/*.sql | sort`. Name yours as `<N+1>_*.sql`.
If you land after another worktree, renumber yours and update `meta/_journal.json`
before opening a PR. The journal entry `idx` must match the numeric prefix.

**Wrong:** Creating `0002_weekly_insights.sql` when `0002_health_extractions.sql`
already exists on main.

---

### 2. Profile fixture cascade — adding a field to `Profile` zod

**Why:** When a new nullable field is added to `src/contracts/zod/profile.ts`,
every test file that constructs a `Profile` literal must include it or TypeScript
will error.

**Fix:** After changing `src/contracts/zod/profile.ts`, update **all three**:
1. `src/db/schema/profiles.ts` — add the Drizzle column.
2. `src/server/profile/repo.ts` `rowToProfile()` — map the new column.
3. Every test fixture that builds a `Profile` object:

```
src/engine/__fixtures__/contexts.ts
src/engine/__tests__/buildModifyPrompt.test.ts
src/engine/__tests__/prompt.dietary-pattern.test.ts
src/engine/__tests__/score.test.ts
src/lib/feed-me/__tests__/buildContext.test.ts
src/server/profile/__tests__/apply-health-extraction.test.ts
src/server/profile/__tests__/macros.test.ts
src/server/profile/__tests__/repo.test.ts
src/server/recommendation/__tests__/actions.test.ts
src/server/recommendation/__tests__/modify.test.ts
src/server/recommendation/__tests__/weekly-insight.test.ts
src/components/feature/home/__tests__/ProactiveBrief.weeklyInsight.test.tsx
src/app/__tests__/HealthDocStep.test.tsx
src/app/home/__tests__/home.snapshot.test.tsx
```

Run `bun run typecheck` immediately after — it surfaces missing fields across
all fixtures in one pass.

---

### 3. Passing non-serializable props across the RSC boundary

**Why:** A Server Component passes a function or class instance to a Client
Component as a prop (e.g. `isComplete` function from `OnboardingStepMeta`).
Next.js throws `clientReferenceManifest` errors at runtime (500).

**Fix:** Only plain JSON-serializable values (`string`, `number`, `boolean`,
arrays, plain objects) may cross the RSC→Client boundary. Move any logic that
requires a function into the Client Component itself (import the pure helper
directly) or into a Server Component that renders the result.

**Wrong:**
```tsx
// RSC — BAD
<StepperClient steps={ONBOARDING_STEPS} />  // steps[].isComplete is a function
```
**Right:**
```tsx
// RSC — GOOD: call isComplete server-side, pass only the boolean result
<StepperClient steps={ONBOARDING_STEPS.map(s => ({ ...s, complete: s.isComplete(profile) }))} />
```

---

### 4. Importing DB/server modules from `'use client'` files

**Why:** Agents sometimes import from `@/server/*` or `@/db/*` directly inside
a `'use client'` file, thinking "it's just a type import." Even `import type`
from a file that has `import 'server-only'` at the top causes the bundler to
fail.

**Fix:** `'use client'` files may **only** import:
- Server *actions* (files that start with `'use server'`) — this is safe; Next.js
  handles the boundary.
- `import type` from `@/contracts/zod/*` or `@/engine/ports/*` — pure types, no
  runtime code.

Never: `import { db } from '@/db/client'`, `import { profiles } from '@/db/schema/profiles'`,
or anything that pulls `drizzle-orm` into the client bundle.

---

### 5. Cherry-picking instead of merging when worktrees diverge

**Why:** R1/R2/R3 branches were cut off a pre-R3 base. After R3 landed on main,
cherry-picking individual commits orphaned the context — the cherry-picked commits
didn't include the `dietary_pattern` field that R3 added, so test fixtures broke.

**Fix:** After main advances (especially after a DB schema change), do not
cherry-pick individual commits from a worktree branch. Instead:
```bash
git fetch origin
git rebase origin/main   # or git merge origin/main
```
Then resolve conflicts in context — the conflict will surface the missing fixture
fields directly.

---

### 6. Embedded git repos inside `.claude/worktrees/`

**Why:** The harness creates agent workspaces under `.claude/worktrees/`. If
the agent runs `git init` or clones inside that directory, it creates a nested
`.git` that confuses the outer repo.

**Fix:** `.claude/worktrees/` is already gitignored (see `.gitignore`). Never
run `git init` inside it. Use `./scripts/wt.sh new <name>` to create proper
sibling worktrees (`../whattoeat-<name>`), not subdirectories.

---

### 7. Bypassing `LlmClient` — calling LLM APIs directly

**Why:** Agents add a new AI feature and reach for `fetch()` to the Gemini or
OpenAI API directly rather than going through the port.

**Fix:** Always use the port and `resolveClient()`:

```ts
import { resolveClient } from '@/lib/feed-me/resolveClient';

const llm = resolveClient(override);   // override = injected in tests
const result = await llm.generateStructured({ system, user, schema: MySchema });
```

The port is at `src/engine/ports/llm.ts`. The factory is at
`src/lib/feed-me/resolveClient.ts`. Tests inject a `FakeLlmClient` via the
`override` argument; prod gets `GeminiLlmClient` automatically.

**Wrong:** `const res = await fetch('https://generativelanguage.googleapis.com/...')`

---

### 8. Server actions that return raw values instead of `ActionResult<T>`

**Why:** Agents copy the profile-actions pattern (which throws on error) instead
of the pantry/onboarding pattern (which returns a typed discriminated union).

**The correct shape** (defined in `src/server/contracts.ts`):
```ts
export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: ServerError };
```

New server actions for features that handle user-facing errors **must** return
`ActionResult<T>`. Throwing in a server action serializes as a generic error
across the boundary — callers can't distinguish error types.

**Exception:** Actions that are always called server-side only (e.g.
`getMyProfile()` from a Server Component) may throw, since there is no
serialization boundary.

Note: `src/server/recommendation/actions.ts` uses its own `RecommendActionResult`
(a compatible discriminated union with richer error codes). That is intentional;
don't flatten it to `ActionResult`.

---

### 9. Forgetting to bump `PROMPTS_VERSION` after changing a system prompt

**Why:** The prompts version is used as a cache key for recommendation runs. If
the prompt changes without a version bump, cached results from the old prompt
will be served without invalidation.

**Fix:** Any time you edit text in `src/engine/prompt.ts` (system prompt,
builder functions, or the `WeeklyInsight` prompt), increment the constant:

```ts
// src/engine/prompt.ts
export const PROMPTS_VERSION = '2026-04-26.3';  // bump date or revision suffix
```

The format is `YYYY-MM-DD.N` (today's date + revision counter). The value is
included in every LLM call's user payload and stored in `recommendation_runs`.

---

### 10. Adding a field to the `Profile` zod without updating Drizzle schema

**Why:** Agents update `src/contracts/zod/profile.ts` and `rowToProfile` in the
repo file but forget that `src/db/schema/profiles.ts` must also change, AND a
new migration (`supabase/migrations/`) must be written for the column to exist
in the database.

**Fix — checklist for any new Profile field:**
1. Add to `src/contracts/zod/profile.ts` (Zod schema).
2. Add to `src/db/schema/profiles.ts` (Drizzle table definition).
3. Add to `rowToProfile()` in `src/server/profile/repo.ts`.
4. Add to `upsertProfile()` values spread in `src/server/profile/repo.ts` if
   the field should be patchable.
5. Write `supabase/migrations/<next-number>_<description>.sql` with the `ALTER
   TABLE` statement. Use `IF NOT EXISTS` / `IF EXISTS` so re-runs are safe.
6. Apply it: `bun run db:migrate` (runs everything pending against
   `$SUPABASE_DB_URL`; tracked in the `_wte_applied_migrations` table).
   Use `bun run db:migrate:status` to see applied vs pending.
7. Update all test fixtures (see mistake #2 above).

Missing step 5 means the column exists in TypeScript types but not in the actual
database, causing silent `undefined` values in prod. Missing step 6 is the same
thing in disguise — the file is committed but the schema never changes.
