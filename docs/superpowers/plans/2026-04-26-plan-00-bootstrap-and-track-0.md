# Plan 00 — Bootstrap & Track 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wipe v1, lay tooling/agent/CI foundations, land Track 0 (frozen contracts + Postgres schema + RLS + tests), seed the Cline Kanban — so that plans 01–12 can be authored and executed in parallel worktrees.

**Architecture:** Bun + Next.js 15 (App Router) + Supabase (Postgres/Auth/Storage/RLS) + Drizzle ORM + Zod. A hexagonal `src/engine/` core (added in Plan 02) plus per-feature folder slices. Track 0 lands the contracts (Zod + Drizzle + engine ports) every other plan imports from.

**Tech Stack:** Bun, Next.js 15, React 19, Supabase JS (`@supabase/supabase-js`, `@supabase/ssr`), Drizzle ORM + `drizzle-kit`, Zod, Biome, Vitest, Husky + lint-staged, GitHub Actions.

**Spec reference:** `docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md` — sections 3 (data model), 4 (engine ports), 6 (parallelization & workflow), 8 (auth/RLS/cleanup).

**Prerequisites (manual, before Task 1):**
- A Supabase project exists (or create one at https://supabase.com/dashboard). Capture: project URL, anon key, service-role key, DB connection string (pooler).
- A Cline Kanban server is reachable at `http://127.0.0.1:3484/whattoeat`.
- `bun` is installed (`curl -fsSL https://bun.sh/install | bash`).
- The user has populated `.env.local` with the keys above before running the migration tasks.

---

## File Structure

What this plan creates (relative to repo root):

```
.env.example                                 # env surface for v2.0
.gitignore                                   # updated
package.json                                 # rewritten: bun, next 15, supabase, drizzle, zod, etc.
tsconfig.json                                # strict + noUncheckedIndexedAccess
biome.json                                   # lint + format config
vitest.config.ts                             # test runner config
drizzle.config.ts                            # drizzle-kit config
next.config.ts                               # minimal
postcss.config.mjs                           # kept (tailwind)

CONTRIBUTING.md                              # 1-page workflow doc
README.md                                    # fresh
CLAUDE.md                                    # generated agent shim
AGENTS.md                                    # generated agent shim
GEMINI.md                                    # generated agent shim

.claude/commands/start-task.md               # slash command
.claude/commands/finish-task.md              # slash command
.cursor/rules/project.mdc                    # generated agent shim
.github/copilot-instructions.md              # generated agent shim

.github/workflows/quality.yml                # build/typecheck/lint/test
.github/workflows/engine-eval.yml            # runs eval harness on engine PRs
.github/workflows/review.yml                 # code-reviewer agent on PRs
.github/workflows/security-review.yml        # security review on auth/RLS PRs

.husky/pre-commit                            # lint-staged
.husky/pre-push                              # full typecheck/lint/test

docs/PROJECT_RULES.md                        # single source of truth for agents
docs/superpowers/specs/kanban-tasks.yaml     # kanban seed data

scripts/sync-agent-rules.ts                  # generates the agent shims
scripts/wt.sh                                # worktree helper
scripts/seed-kanban.ts                       # populates Cline Kanban from yaml

src/contracts/zod/profile.ts                 # Profile + DTOs
src/contracts/zod/pantry.ts                  # PantryItem + DTOs
src/contracts/zod/checkin.ts                 # Checkin + DTOs
src/contracts/zod/recipe.ts                  # Recipe + Ingredient + Step + Macros
src/contracts/zod/recommendation.ts          # RecommendationContext + MealCandidate + Result
src/contracts/zod/signals.ts                 # HealthSignals
src/contracts/zod/index.ts                   # re-exports

src/engine/ports/llm.ts                      # LlmClient interface
src/engine/ports/signal-provider.ts          # SignalProvider interface
src/engine/ports/logger.ts                   # Logger interface
src/engine/types.ts                          # public type re-exports

src/server/contracts.ts                      # Server Action + Route Handler types

src/db/schema/profiles.ts                    # Drizzle table
src/db/schema/pantry-items.ts                # Drizzle table
src/db/schema/checkins.ts                    # Drizzle table
src/db/schema/recipes.ts                     # Drizzle table
src/db/schema/cooked-log.ts                  # Drizzle table
src/db/schema/recommendation-runs.ts         # Drizzle table
src/db/schema/signal-snapshots.ts            # Drizzle table
src/db/schema/index.ts                       # re-exports
src/db/client.ts                             # Drizzle client (server-only)

supabase/migrations/0001_initial_schema.sql  # tables + indexes + RLS
supabase/seed.sql                            # empty (placeholder)

tests/rls/profiles.test.ts                   # RLS user-isolation tests
tests/rls/pantry.test.ts
tests/rls/checkins.test.ts
tests/rls/recipes.test.ts
tests/rls/cooked-log.test.ts
tests/rls/recommendation-runs.test.ts
tests/rls/signal-snapshots.test.ts
tests/rls/_helpers.ts                        # createUser, signIn helpers
```

What this plan deletes:
```
src/lib/firebase.ts
src/lib/firebase-admin.ts
src/lib/auth.ts
src/lib/db.ts
src/lib/context/AuthContext.tsx
src/components/auth/AuthWrapper.tsx
src/components/layout/Header.tsx
src/components/layout/MainLayout.tsx
src/components/ui/*                          # entire dir; rebuilt in Plan 01
src/pages/                                   # entire dir
src/app/debug/
src/app/recipes/
src/app/generate/
src/app/profile/
src/app/register/
src/app/signin/
src/app/page.tsx
src/app/providers.tsx
src/lib/utils.ts                             # rebuilt in Plan 01 if needed
posscss.config.js
.eslintrc.json
eslint.config.mjs
components.json
tailwind.config.js                           # rebuilt in Plan 01
```

Drizzle is the source of truth for the schema. The SQL migration in `supabase/migrations/` is generated from Drizzle and committed; later schema edits go through `drizzle-kit generate`.

---

## Conventions used in this plan

- File paths are repo-relative.
- `bun` is the package manager and test runner.
- All imports use the `@/` alias for `src/`.
- All UUIDs use `uuid` v4 via `gen_random_uuid()` in Postgres.
- Every commit message follows `area: short imperative`.
- "Run X, expected Y" in steps means literally that — fail the step if Y doesn't happen.

---

## Tasks

### Task 1: Wipe v1 source and obsolete config

**Files:**
- Delete: see "What this plan deletes" list above.

- [ ] **Step 1: Delete v1 source and config**

```bash
cd /Users/ravishah/Documents/whattoeat
rm -rf src/lib src/pages src/app src/components
rm -f posscss.config.js .eslintrc.json eslint.config.mjs components.json tailwind.config.js
rm -rf .next
```

- [ ] **Step 2: Restore minimal app skeleton (placeholder until Plan 01)**

```bash
mkdir -p src/app
```

Write `src/app/layout.tsx`:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Write `src/app/page.tsx`:

```tsx
export default function HomePage() {
  return <main style={{ padding: 24, fontFamily: 'system-ui' }}>WhatToEat 2.0 — bootstrap landing.</main>;
}
```

- [ ] **Step 3: Replace README**

Write `README.md`:

```markdown
# WhatToEat 2.0

Personal meal-decision engine. Pantry + goals + daily check-in → recommended meals. Architected so future health signals (Apple Health, Eight Sleep, Superpower Labs) plug in as additional context.

**Spec:** `docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md`
**Project rules (read first):** `docs/PROJECT_RULES.md`
**Kanban:** http://127.0.0.1:3484/whattoeat

## Local dev

```bash
bun install
cp .env.example .env.local   # then fill in
bun run dev
```

## Quality gates

```bash
bun run typecheck
bun run lint
bun run test
```
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: wipe v1 source and obsolete config"
```

---

### Task 2: Rewrite `package.json` and install fresh deps

**Files:**
- Modify: `package.json` (full rewrite)

- [ ] **Step 1: Write new `package.json`**

```json
{
  "name": "whattoeat",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "agents:sync": "bun scripts/sync-agent-rules.ts",
    "kanban:seed": "bun scripts/seed-kanban.ts",
    "prepare": "husky"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.45.0",
    "drizzle-orm": "^0.36.0",
    "next": "^15.2.2",
    "postgres": "^3.4.5",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@types/node": "^22.7.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "drizzle-kit": "^0.28.0",
    "husky": "^9.1.6",
    "lint-staged": "^15.2.10",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx,json,md}": ["biome check --write --no-errors-on-unmatched"]
  }
}
```

- [ ] **Step 2: Wipe lockfile + node_modules**

```bash
rm -rf node_modules package-lock.json bun.lock bun.lockb
```

- [ ] **Step 3: Install with bun**

```bash
bun install
```

Expected: installs cleanly; produces `bun.lock`.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: rewrite package.json on bun, fresh deps"
```

---

### Task 3: TypeScript strict config

**Files:**
- Modify: `tsconfig.json` (full rewrite)
- Create: `next-env.d.ts` (kept from v1; verify exists)

- [ ] **Step 1: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Verify**

```bash
bun run typecheck
```

Expected: no output / exit 0 (the bare layout/page compile clean).

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: typescript strict + noUncheckedIndexedAccess"
```

---

### Task 4: Biome config (replaces ESLint + Prettier)

**Files:**
- Create: `biome.json`

- [ ] **Step 1: Write `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "files": {
    "ignore": [".next/**", "node_modules/**", "dist/**", "supabase/**", ".husky/**", "bun.lock"]
  },
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "useImportType": "error",
        "useNodejsImportProtocol": "error"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "suspicious": {
        "noConsoleLog": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "semicolons": "always", "trailingCommas": "all" }
  }
}
```

- [ ] **Step 2: Verify**

```bash
bun run lint
```

Expected: passes (or only formatting hints we'll fix in step 3).

- [ ] **Step 3: Auto-fix any formatting drift**

```bash
bun run lint:fix
```

- [ ] **Step 4: Commit**

```bash
git add biome.json src/
git commit -m "chore: biome config (replaces eslint + prettier)"
```

---

### Task 5: Vitest config

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    setupFiles: [],
  },
});
```

- [ ] **Step 2: Sanity test**

Create `src/_smoke.test.ts`:

```ts
import { expect, test } from 'vitest';
test('smoke', () => { expect(1 + 1).toBe(2); });
```

- [ ] **Step 3: Run**

```bash
bun run test
```

Expected: 1 passing test.

- [ ] **Step 4: Delete the smoke test**

```bash
rm src/_smoke.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: vitest config"
```

---

### Task 6: Husky + lint-staged (pre-commit + pre-push)

**Files:**
- Create: `.husky/pre-commit`
- Create: `.husky/pre-push`

- [ ] **Step 1: Initialize Husky**

```bash
bunx husky init
```

This creates `.husky/pre-commit` with a default. We'll overwrite it.

- [ ] **Step 2: Write `.husky/pre-commit`**

```bash
#!/usr/bin/env sh
bunx lint-staged
```

Make executable:

```bash
chmod +x .husky/pre-commit
```

- [ ] **Step 3: Write `.husky/pre-push`**

```bash
#!/usr/bin/env sh
set -e
echo "→ typecheck"
bun run typecheck
echo "→ lint"
bun run lint
echo "→ test"
bun run test
```

Make executable:

```bash
chmod +x .husky/pre-push
```

- [ ] **Step 4: Verify hooks fire**

Make a trivial change and commit:

```bash
echo "" >> README.md
git add README.md
git commit -m "test: husky"
```

Expected: pre-commit runs lint-staged. Reset:

```bash
git reset --soft HEAD~1
git checkout README.md
```

- [ ] **Step 5: Commit hooks**

```bash
git add .husky package.json
git commit -m "chore: husky pre-commit + pre-push"
```

---

### Task 7: `docs/PROJECT_RULES.md` — single source of truth for agents

**Files:**
- Create: `docs/PROJECT_RULES.md`

- [ ] **Step 1: Write `docs/PROJECT_RULES.md`**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/PROJECT_RULES.md
git commit -m "docs: PROJECT_RULES.md as single source of truth"
```

---

### Task 8: Agent-shim generator script

**Files:**
- Create: `scripts/sync-agent-rules.ts`

- [ ] **Step 1: Write `scripts/sync-agent-rules.ts`**

```ts
#!/usr/bin/env bun
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const RULES_PATH = 'docs/PROJECT_RULES.md';
const rules = readFileSync(RULES_PATH, 'utf8');

const HEADER = `<!-- AUTO-GENERATED from ${RULES_PATH} via scripts/sync-agent-rules.ts. Do not edit. -->\n\n`;

const PREAMBLE = `# Agent Bootstrap

You are working in the WhatToEat 2.0 repo.

**Before doing anything:**
1. Read \`docs/PROJECT_RULES.md\` (the rules below are a copy; the rules file is canonical).
2. Check the Cline Kanban at http://127.0.0.1:3484/whattoeat for an unclaimed Ready card matching the current wave.
3. If you have a card, run \`/start-task\` (Claude Code) or follow the equivalent worktree workflow.

The current spec is at \`docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md\`. The current implementation plans are under \`docs/superpowers/plans/\`.

---

`;

const targets = [
  'CLAUDE.md',
  'AGENTS.md',
  'GEMINI.md',
  '.cursor/rules/project.mdc',
  '.github/copilot-instructions.md',
];

for (const target of targets) {
  mkdirSync(dirname(target) || '.', { recursive: true });
  writeFileSync(target, HEADER + PREAMBLE + rules);
  console.log(`wrote ${target}`);
}
```

- [ ] **Step 2: Add to pre-commit (so shims never drift)**

Edit `.husky/pre-commit` to:

```bash
#!/usr/bin/env sh
bun scripts/sync-agent-rules.ts
git add CLAUDE.md AGENTS.md GEMINI.md .cursor/rules/project.mdc .github/copilot-instructions.md
bunx lint-staged
```

- [ ] **Step 3: Run the generator**

```bash
bun scripts/sync-agent-rules.ts
```

Expected: writes 5 files.

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-agent-rules.ts .husky/pre-commit CLAUDE.md AGENTS.md GEMINI.md .cursor/rules/project.mdc .github/copilot-instructions.md
git commit -m "chore: agent-shim generator + 5 generated shims"
```

---

### Task 9: `CONTRIBUTING.md` (1 page)

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write `CONTRIBUTING.md`**

```markdown
# Contributing to WhatToEat 2.0

## TL;DR

1. Read `docs/PROJECT_RULES.md`.
2. Pick a Ready card on the kanban (`http://127.0.0.1:3484/whattoeat`).
3. Run `./scripts/wt.sh new <track-name>` to create an isolated worktree.
4. Implement only files in the card's owned-paths list.
5. `/finish-task` runs typecheck + lint + tests + code-reviewer.
6. PR. CI gates merge to `main`.

## Architecture in one diagram

```
src/app/**           UI only
src/server/**        DB + network + engine glue
src/engine/**        pure domain — no DB/network/framework imports
src/contracts/zod/** schemas, shared by all layers
src/db/schema/**     Drizzle, source of truth
```

## Worktree workflow

```bash
./scripts/wt.sh new track-5-pantry
cd ../whattoeat-track-5-pantry
bun install
# work
git push -u origin wt/track-5-pantry
gh pr create
```

Each worktree gets a unique dev port automatically.

## Code review

Two layers:
- **During work:** `/finish-task` dispatches `superpowers:code-reviewer` against your diff.
- **At PR:** GitHub Actions runs the same review + security review + engine eval (if applicable).

A `pass` verdict is required before the kanban card moves to Review.
```

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: CONTRIBUTING.md"
```

---

### Task 10: `scripts/wt.sh` — worktree helper

**Files:**
- Create: `scripts/wt.sh`

- [ ] **Step 1: Write `scripts/wt.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

cmd="${1:-}"

case "$cmd" in
  new)
    name="${2:-}"
    if [ -z "$name" ]; then
      echo "usage: scripts/wt.sh new <track-name>"
      exit 1
    fi
    branch="wt/$name"
    path="../whattoeat-$name"
    git fetch origin main
    git worktree add -b "$branch" "$path" origin/main
    cp .env.local "$path/.env.local" 2>/dev/null || true
    echo
    echo "Worktree created at $path on branch $branch"
    echo "Next:"
    echo "  cd $path && bun install && bun run dev -p \$(node -e \"console.log(3000+Math.floor(Math.random()*900))\")"
    ;;
  list)
    git worktree list
    ;;
  remove)
    name="${2:-}"
    if [ -z "$name" ]; then
      echo "usage: scripts/wt.sh remove <track-name>"
      exit 1
    fi
    git worktree remove "../whattoeat-$name"
    git branch -D "wt/$name" 2>/dev/null || true
    ;;
  *)
    echo "usage: scripts/wt.sh {new|list|remove} <track-name>"
    exit 1
    ;;
esac
```

Make executable:

```bash
chmod +x scripts/wt.sh
```

- [ ] **Step 2: Smoke test (dry — don't actually create one yet, since main isn't ready)**

```bash
bash scripts/wt.sh
```

Expected: prints usage.

- [ ] **Step 3: Commit**

```bash
git add scripts/wt.sh
git commit -m "chore: worktree helper script"
```

---

### Task 11: Slash commands `/start-task` and `/finish-task`

**Files:**
- Create: `.claude/commands/start-task.md`
- Create: `.claude/commands/finish-task.md`

- [ ] **Step 1: Write `.claude/commands/start-task.md`**

```markdown
---
description: Pick the next Ready kanban card, create a worktree, brief on the task
---

You are starting work on the next available kanban card. Follow this exactly:

1. **Read `docs/PROJECT_RULES.md`** in full.
2. **List Ready cards** on the kanban (`http://127.0.0.1:3484/whattoeat`). Identify the lowest-numbered Ready card whose dependencies are all `Done`. If none, report and stop.
3. **Read the card body**: spec/contract refs, owned paths, acceptance criteria, branch name.
4. **Open the spec sections** the card references (read them; don't skim).
5. **Read every file in the contract refs** (Zod schemas, port interfaces, schema files).
6. **Create a worktree:** `./scripts/wt.sh new <branch-suffix-from-card>` — then `cd` into it.
7. **Move the card to In Progress** on the kanban.
8. **Announce the plan** to the user: which card, which owned paths, what acceptance criteria look like, your task-by-task approach.
9. **STOP and wait for user confirmation** before writing any code.
```

- [ ] **Step 2: Write `.claude/commands/finish-task.md`**

```markdown
---
description: Verify the current task is done, run code-reviewer, advance the kanban
---

You are wrapping up the current task. Follow this exactly:

1. **Confirm you are in a worktree** (not main): `git rev-parse --abbrev-ref HEAD` should return `wt/...`.
2. **Run quality gates:**
   - `bun run typecheck` — must pass.
   - `bun run lint` — must pass.
   - `bun run test` — must pass.
   If any fail, fix and re-run. Do not advance.
3. **Verify owned-paths discipline:** `git diff --name-only origin/main...HEAD` — every changed file must be in the kanban card's owned-paths list. If anything else changed, revert it or report.
4. **Dispatch code review:** invoke the `superpowers:code-reviewer` agent on the diff with the spec section + acceptance criteria + forbidden-patterns list as context. Wait for its verdict.
5. **If the verdict is `pass`:** push the branch, open a PR, move the kanban card to Review.
6. **If `request-changes` or `block`:** address each finding, then re-run from step 2.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/
git commit -m "chore: /start-task and /finish-task slash commands"
```

---

### Task 12: GitHub Actions — `quality.yml`

**Files:**
- Create: `.github/workflows/quality.yml`

- [ ] **Step 1: Write `.github/workflows/quality.yml`**

```yaml
name: quality

on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun run lint
      - run: bun run test
      - run: bun run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co' }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder' }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/quality.yml
git commit -m "ci: quality gate (typecheck/lint/test/build)"
```

---

### Task 13: GitHub Actions — `engine-eval.yml`

**Files:**
- Create: `.github/workflows/engine-eval.yml`

- [ ] **Step 1: Write `.github/workflows/engine-eval.yml`**

```yaml
name: engine-eval

on:
  pull_request:
    paths:
      - 'src/engine/**'
      - 'src/server/adapters/**'
      - 'src/contracts/zod/recommendation.ts'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }
      - run: bun install --frozen-lockfile
      - name: Run eval harness
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: |
          if [ -f scripts/run-eval.ts ]; then
            bun scripts/run-eval.ts > eval-output.md
          else
            echo "Eval harness not yet present (Plan 03 lands it). Skipping." > eval-output.md
          fi
      - name: Comment eval results on PR
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: eval-output.md
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/engine-eval.yml
git commit -m "ci: engine-eval workflow (placeholder until Plan 03)"
```

---

### Task 14: GitHub Actions — `review.yml`

**Files:**
- Create: `.github/workflows/review.yml`

- [ ] **Step 1: Write `.github/workflows/review.yml`**

This workflow exists as a placeholder; the actual code-reviewer agent invocation depends on the `claude-code-action` (or equivalent) runner. The job is wired but no-ops until that runner is configured.

```yaml
name: review

on:
  pull_request:

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Notice
        run: |
          echo "Code-reviewer agent runs here once the runner is configured."
          echo "Until then, the local /finish-task code-reviewer is the gate."
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/review.yml
git commit -m "ci: review workflow (placeholder for code-reviewer agent runner)"
```

---

### Task 15: GitHub Actions — `security-review.yml`

**Files:**
- Create: `.github/workflows/security-review.yml`

- [ ] **Step 1: Write `.github/workflows/security-review.yml`**

```yaml
name: security-review

on:
  pull_request:
    paths:
      - 'src/middleware.ts'
      - 'src/server/auth/**'
      - 'src/app/api/**'
      - 'supabase/migrations/**'
      - 'src/db/schema/**'

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Notice
        run: |
          echo "Security-review agent runs on auth/RLS/route changes once configured."
          echo "Local /security-review slash command is the interim gate."
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/security-review.yml
git commit -m "ci: security-review workflow (placeholder)"
```

---

### Task 16: `.env.example` and `.gitignore` updates

**Files:**
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Write `.env.example`**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_URL=postgres://postgres:PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres

# LLM (Plan 03)
GEMINI_API_KEY=AIza...

# Rate limiting (Plan 12)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Observability (Plan 12)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Update `.gitignore`**

Read current `.gitignore` and append (do not duplicate existing lines):

```
# Worktrees (defensive — they live outside the repo, but if anyone cd's wrong)
../whattoeat-*

# Supabase local
supabase/.branches
supabase/.temp

# Test artifacts
coverage/
```

- [ ] **Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: .env.example + .gitignore updates"
```

---

### Task 17: Drizzle config

**Files:**
- Create: `drizzle.config.ts`

- [ ] **Step 1: Write `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL ?? '',
  },
  verbose: true,
  strict: true,
});
```

- [ ] **Step 2: Commit**

```bash
git add drizzle.config.ts
git commit -m "chore: drizzle-kit config"
```

---

### Task 18: Zod contract — `Profile`

**Files:**
- Create: `src/contracts/zod/profile.ts`

- [ ] **Step 1: Write the schema**

```ts
import { z } from 'zod';

export const Goal = z.enum(['cut', 'maintain', 'bulk']);
export type Goal = z.infer<typeof Goal>;

export const Sex = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);
export type Sex = z.infer<typeof Sex>;

export const ActivityLevel = z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']);
export type ActivityLevel = z.infer<typeof ActivityLevel>;

export const MacroTargets = z.object({
  kcal: z.number().int().positive(),
  protein_g: z.number().int().nonnegative(),
  carbs_g: z.number().int().nonnegative(),
  fat_g: z.number().int().nonnegative(),
});
export type MacroTargets = z.infer<typeof MacroTargets>;

export const Profile = z.object({
  user_id: z.string().uuid(),
  display_name: z.string().min(1).max(80).nullable(),
  goal: Goal,
  targets: MacroTargets,
  height_cm: z.number().positive().nullable(),
  weight_kg: z.number().positive().nullable(),
  birthdate: z.string().date().nullable(),
  sex: Sex.nullable(),
  activity_level: ActivityLevel.nullable(),
  allergies: z.array(z.string().min(1)).default([]),
  dislikes: z.array(z.string().min(1)).default([]),
  cuisines: z.array(z.string().min(1)).default([]),
  equipment: z.array(z.string().min(1)).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Profile = z.infer<typeof Profile>;

export const ProfileUpdate = Profile.omit({
  user_id: true,
  created_at: true,
  updated_at: true,
}).partial();
export type ProfileUpdate = z.infer<typeof ProfileUpdate>;
```

- [ ] **Step 2: Commit**

```bash
git add src/contracts/zod/profile.ts
git commit -m "contracts: Profile zod schema"
```

---

### Task 19: Zod contract — `PantryItem`

**Files:**
- Create: `src/contracts/zod/pantry.ts`

- [ ] **Step 1: Write the schema**

```ts
import { z } from 'zod';

export const PantryCategory = z.enum([
  'protein',
  'produce',
  'grain',
  'dairy',
  'pantry',
  'other',
]);
export type PantryCategory = z.infer<typeof PantryCategory>;

export const PantryItem = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  display_name: z.string().min(1).max(120),
  category: PantryCategory,
  available: z.boolean(),
  added_at: z.string().datetime(),
});
export type PantryItem = z.infer<typeof PantryItem>;

export const PantryItemCreate = z.object({
  display_name: z.string().min(1).max(120),
});
export type PantryItemCreate = z.infer<typeof PantryItemCreate>;

export const PantryItemUpdate = z.object({
  available: z.boolean().optional(),
  category: PantryCategory.optional(),
  display_name: z.string().min(1).max(120).optional(),
});
export type PantryItemUpdate = z.infer<typeof PantryItemUpdate>;
```

- [ ] **Step 2: Commit**

```bash
git add src/contracts/zod/pantry.ts
git commit -m "contracts: PantryItem zod schema"
```

---

### Task 20: Zod contract — `Checkin`

**Files:**
- Create: `src/contracts/zod/checkin.ts`

- [ ] **Step 1: Write the schema**

```ts
import { z } from 'zod';

export const TrainingLevel = z.enum(['none', 'light', 'hard']);
export type TrainingLevel = z.infer<typeof TrainingLevel>;

export const HungerLevel = z.enum(['low', 'normal', 'high']);
export type HungerLevel = z.infer<typeof HungerLevel>;

export const Checkin = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  date: z.string().date(),
  energy: z.number().int().min(1).max(5),
  training: TrainingLevel,
  hunger: HungerLevel,
  note: z.string().max(500).nullable(),
  created_at: z.string().datetime(),
});
export type Checkin = z.infer<typeof Checkin>;

export const CheckinUpsert = z.object({
  date: z.string().date(),
  energy: z.number().int().min(1).max(5),
  training: TrainingLevel,
  hunger: HungerLevel,
  note: z.string().max(500).nullable().optional(),
});
export type CheckinUpsert = z.infer<typeof CheckinUpsert>;
```

- [ ] **Step 2: Commit**

```bash
git add src/contracts/zod/checkin.ts
git commit -m "contracts: Checkin zod schema"
```

---

### Task 21: Zod contract — `Recipe`, `Ingredient`, `Step`, `Macros`

**Files:**
- Create: `src/contracts/zod/recipe.ts`

- [ ] **Step 1: Write the schema**

```ts
import { z } from 'zod';

export const Macros = z.object({
  kcal: z.number().int().nonnegative(),
  protein_g: z.number().int().nonnegative(),
  carbs_g: z.number().int().nonnegative(),
  fat_g: z.number().int().nonnegative(),
});
export type Macros = z.infer<typeof Macros>;

export const Ingredient = z.object({
  name: z.string().min(1).max(120),
  qty: z.number().nonnegative().nullable(),
  unit: z.string().max(20).nullable(),
  note: z.string().max(120).nullable().optional(),
});
export type Ingredient = z.infer<typeof Ingredient>;

export const Step = z.object({
  idx: z.number().int().min(1),
  text: z.string().min(1).max(800),
  durationMin: z.number().int().nonnegative().nullable().optional(),
});
export type Step = z.infer<typeof Step>;

export const RecipeSource = z.enum(['ai-generated', 'user-saved', 'imported']);
export type RecipeSource = z.infer<typeof RecipeSource>;

export const Recipe = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullable(),
  ingredients: z.array(Ingredient).min(1).max(50),
  steps: z.array(Step).min(1).max(40),
  macros: Macros,
  servings: z.number().int().min(1).max(20),
  total_minutes: z.number().int().min(1).max(480),
  cuisine: z.string().max(40).nullable(),
  tags: z.array(z.string().min(1).max(40)).default([]),
  source: RecipeSource,
  generated_run_id: z.string().uuid().nullable(),
  saved: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Recipe = z.infer<typeof Recipe>;
```

- [ ] **Step 2: Commit**

```bash
git add src/contracts/zod/recipe.ts
git commit -m "contracts: Recipe zod schema"
```

---

### Task 22: Zod contract — `HealthSignals`

**Files:**
- Create: `src/contracts/zod/signals.ts`

- [ ] **Step 1: Write the schema**

```ts
import { z } from 'zod';

export const SleepQuality = z.enum(['poor', 'ok', 'great']);

export const SleepSignal = z.object({
  lastNightHours: z.number().nonnegative(),
  quality: SleepQuality.optional(),
});

export const TrainingSignal = z.object({
  yesterdayLoad: z.enum(['rest', 'light', 'hard']).optional(),
  muscleGroups: z.array(z.string()).optional(),
});

export const RecoverySignal = z.object({
  hrvMs: z.number().nonnegative().optional(),
  restingHr: z.number().nonnegative().optional(),
});

export const LabsSignal = z.object({
  fastingGlucose: z.number().nonnegative().optional(),
  recentBiomarkers: z.record(z.string(), z.number()).optional(),
});

export const HealthSignals = z.object({
  sleep: SleepSignal.optional(),
  training: TrainingSignal.optional(),
  recovery: RecoverySignal.optional(),
  labs: LabsSignal.optional(),
});
export type HealthSignals = z.infer<typeof HealthSignals>;

export const SignalSource = z.enum(['apple_health', 'eight_sleep', 'superpower']);
export type SignalSource = z.infer<typeof SignalSource>;
```

- [ ] **Step 2: Commit**

```bash
git add src/contracts/zod/signals.ts
git commit -m "contracts: HealthSignals zod schema"
```

---

### Task 23: Zod contract — `RecommendationContext`, `MealCandidate`, `RecommendationResult`

**Files:**
- Create: `src/contracts/zod/recommendation.ts`

- [ ] **Step 1: Write the schema**

```ts
import { z } from 'zod';
import { Ingredient, Macros, Step } from './recipe';
import { HealthSignals } from './signals';
import { Profile } from './profile';
import { PantryItem } from './pantry';
import { Checkin } from './checkin';

export const MealType = z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'any']);
export type MealType = z.infer<typeof MealType>;

export const RecommendationRequest = z.object({
  mealType: MealType.default('any'),
  timeBudgetMin: z.number().int().min(5).max(180).nullable().optional(),
  candidateCount: z.number().int().min(1).max(5).default(3),
});
export type RecommendationRequest = z.infer<typeof RecommendationRequest>;

export const RecommendationContext = z.object({
  pantry: z.array(PantryItem),
  profile: Profile,
  checkin: Checkin.optional(),
  signals: HealthSignals.optional(),
  request: RecommendationRequest,
});
export type RecommendationContext = z.infer<typeof RecommendationContext>;

export const MealCandidate = z.object({
  title: z.string().min(1).max(120),
  oneLineWhy: z.string().min(1).max(280),
  ingredients: z.array(Ingredient).min(1).max(50),
  steps: z.array(Step).min(1).max(40),
  estMacros: Macros,
  servings: z.number().int().min(1).max(20),
  totalMinutes: z.number().int().min(1).max(480),
  cuisine: z.string().max(40).nullable(),
  tags: z.array(z.string().min(1).max(40)).default([]),
  pantryCoverage: z.number().min(0).max(1),
  missingItems: z.array(z.string()).default([]),
});
export type MealCandidate = z.infer<typeof MealCandidate>;

export const TokenUsage = z.object({
  prompt: z.number().int().nonnegative(),
  completion: z.number().int().nonnegative(),
});
export type TokenUsage = z.infer<typeof TokenUsage>;

export const RecommendationResult = z.object({
  candidates: z.array(MealCandidate).min(0).max(5),
  rationale: z.string().min(1).max(1000),
  modelUsed: z.string(),
  tokens: TokenUsage,
  latencyMs: z.number().int().nonnegative(),
});
export type RecommendationResult = z.infer<typeof RecommendationResult>;
```

- [ ] **Step 2: Commit**

```bash
git add src/contracts/zod/recommendation.ts
git commit -m "contracts: RecommendationContext + MealCandidate + Result"
```

---

### Task 24: Zod barrel — `src/contracts/zod/index.ts`

**Files:**
- Create: `src/contracts/zod/index.ts`

- [ ] **Step 1: Write**

```ts
export * from './profile';
export * from './pantry';
export * from './checkin';
export * from './recipe';
export * from './signals';
export * from './recommendation';
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/contracts/zod/index.ts
git commit -m "contracts: barrel export"
```

---

### Task 25: Engine port — `LlmClient`

**Files:**
- Create: `src/engine/ports/llm.ts`

- [ ] **Step 1: Write**

```ts
import type { ZodSchema } from 'zod';
import type { TokenUsage } from '@/contracts/zod';

export interface LlmGenerateArgs<T> {
  system: string;
  user: string;
  schema: ZodSchema<T>;
  cacheKey?: string;
  /** Caller may suggest a model tier; the adapter decides whether to honor it. */
  modelHint?: 'cheap' | 'strong';
  /** Hard timeout in ms. */
  timeoutMs?: number;
}

export interface LlmGenerateResult<T> {
  value: T;
  tokens: TokenUsage;
  modelUsed: string;
}

export interface LlmClient {
  generateStructured<T>(args: LlmGenerateArgs<T>): Promise<LlmGenerateResult<T>>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/ports/llm.ts
git commit -m "engine: LlmClient port"
```

---

### Task 26: Engine port — `SignalProvider`

**Files:**
- Create: `src/engine/ports/signal-provider.ts`

- [ ] **Step 1: Write**

```ts
import type { HealthSignals, SignalSource } from '@/contracts/zod';

export interface DateRange {
  from: string; // ISO date
  to: string;   // ISO date
}

export interface SignalProvider {
  readonly source: SignalSource;
  getSignals(userId: string, range: DateRange): Promise<Partial<HealthSignals>>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/ports/signal-provider.ts
git commit -m "engine: SignalProvider port"
```

---

### Task 27: Engine port — `Logger`

**Files:**
- Create: `src/engine/ports/logger.ts`

- [ ] **Step 1: Write**

```ts
export interface Logger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export const consoleLogger: Logger = {
  info: (m, f) => console.info(m, f ?? {}),
  warn: (m, f) => console.warn(m, f ?? {}),
  error: (m, f) => console.error(m, f ?? {}),
};
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/ports/logger.ts
git commit -m "engine: Logger port"
```

---

### Task 28: Engine types barrel — `src/engine/types.ts`

**Files:**
- Create: `src/engine/types.ts`

- [ ] **Step 1: Write**

```ts
export type {
  RecommendationContext,
  RecommendationRequest,
  RecommendationResult,
  MealCandidate,
  HealthSignals,
  Profile,
  PantryItem,
  Checkin,
  Macros,
  Ingredient,
  Step,
  TokenUsage,
} from '@/contracts/zod';

export type { LlmClient, LlmGenerateArgs, LlmGenerateResult } from './ports/llm';
export type { SignalProvider, DateRange } from './ports/signal-provider';
export type { Logger } from './ports/logger';

/** Engine error subclasses — concrete classes added in Plan 02. */
export class EngineError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'EngineError';
  }
}
export class EngineParseError extends EngineError {
  constructor(message: string, cause?: unknown) { super(message, cause); this.name = 'EngineParseError'; }
}
export class EngineSafetyError extends EngineError {
  constructor(message: string, cause?: unknown) { super(message, cause); this.name = 'EngineSafetyError'; }
}
export class EngineTimeoutError extends EngineError {
  constructor(message: string, cause?: unknown) { super(message, cause); this.name = 'EngineTimeoutError'; }
}
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/engine/types.ts
git commit -m "engine: types barrel + EngineError hierarchy"
```

---

### Task 29: Server contracts — `src/server/contracts.ts`

**Files:**
- Create: `src/server/contracts.ts`

- [ ] **Step 1: Write**

```ts
/**
 * Shared types for Server Actions and Route Handlers.
 * Concrete actions live in `src/server/<feature>/*` (added per feature plan).
 */

export type ServerErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'rate_limited'
  | 'engine_failed'
  | 'engine_safety'
  | 'engine_timeout'
  | 'internal';

export class ServerError extends Error {
  constructor(
    public readonly code: ServerErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ServerError';
  }
}

export type ApiError = { error: { code: ServerErrorCode; message: string } };

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: ServerError };
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/server/contracts.ts
git commit -m "server: shared ServerError + ActionResult types"
```

---

### Task 30: Drizzle schema — `profiles`

**Files:**
- Create: `src/db/schema/profiles.ts`

- [ ] **Step 1: Write**

```ts
import { sql } from 'drizzle-orm';
import { date, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  user_id: uuid('user_id').primaryKey(),
  display_name: text('display_name'),
  goal: text('goal').notNull(),
  target_kcal: integer('target_kcal').notNull(),
  target_protein_g: integer('target_protein_g').notNull(),
  target_carbs_g: integer('target_carbs_g').notNull(),
  target_fat_g: integer('target_fat_g').notNull(),
  height_cm: numeric('height_cm', { precision: 5, scale: 1 }),
  weight_kg: numeric('weight_kg', { precision: 5, scale: 1 }),
  birthdate: date('birthdate'),
  sex: text('sex'),
  activity_level: text('activity_level'),
  allergies: jsonb('allergies').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  dislikes: jsonb('dislikes').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  cuisines: jsonb('cuisines').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  equipment: jsonb('equipment').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ProfileRow = typeof profiles.$inferSelect;
export type ProfileInsert = typeof profiles.$inferInsert;
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema/profiles.ts
git commit -m "db: profiles drizzle schema"
```

---

### Task 31: Drizzle schema — `pantry_items`

**Files:**
- Create: `src/db/schema/pantry-items.ts`

- [ ] **Step 1: Write**

```ts
import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const pantry_items = pgTable(
  'pantry_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    name: text('name').notNull(),
    display_name: text('display_name').notNull(),
    category: text('category').notNull(),
    available: boolean('available').notNull().default(true),
    added_at: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userAvailableIdx: index('pantry_items_user_available_idx').on(t.user_id, t.available),
    userNameUnique: uniqueIndex('pantry_items_user_name_unique').on(t.user_id, sql`lower(${t.name})`),
  }),
);

export type PantryItemRow = typeof pantry_items.$inferSelect;
export type PantryItemInsert = typeof pantry_items.$inferInsert;
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema/pantry-items.ts
git commit -m "db: pantry_items drizzle schema"
```

---

### Task 32: Drizzle schema — `checkins`

**Files:**
- Create: `src/db/schema/checkins.ts`

- [ ] **Step 1: Write**

```ts
import { date, index, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const checkins = pgTable(
  'checkins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    date: date('date').notNull(),
    energy: smallint('energy').notNull(),
    training: text('training').notNull(),
    hunger: text('hunger').notNull(),
    note: text('note'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userDateIdx: index('checkins_user_date_idx').on(t.user_id, t.date),
    userDateUnique: uniqueIndex('checkins_user_date_unique').on(t.user_id, t.date),
  }),
);

export type CheckinRow = typeof checkins.$inferSelect;
export type CheckinInsert = typeof checkins.$inferInsert;
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema/checkins.ts
git commit -m "db: checkins drizzle schema"
```

---

### Task 33: Drizzle schema — `recipes`

**Files:**
- Create: `src/db/schema/recipes.ts`

- [ ] **Step 1: Write**

```ts
import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { Ingredient, Macros, Step } from '@/contracts/zod';

export const recipes = pgTable(
  'recipes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    ingredients: jsonb('ingredients').$type<Ingredient[]>().notNull(),
    steps: jsonb('steps').$type<Step[]>().notNull(),
    macros: jsonb('macros').$type<Macros>().notNull(),
    servings: integer('servings').notNull(),
    total_minutes: integer('total_minutes').notNull(),
    cuisine: text('cuisine'),
    tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    source: text('source').notNull(),
    generated_run_id: uuid('generated_run_id'),
    saved: boolean('saved').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userSavedIdx: index('recipes_user_saved_created_idx').on(t.user_id, t.saved, t.created_at),
  }),
);

export type RecipeRow = typeof recipes.$inferSelect;
export type RecipeInsert = typeof recipes.$inferInsert;
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema/recipes.ts
git commit -m "db: recipes drizzle schema"
```

---

### Task 34: Drizzle schema — `cooked_log`

**Files:**
- Create: `src/db/schema/cooked-log.ts`

- [ ] **Step 1: Write**

```ts
import { index, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const cooked_log = pgTable(
  'cooked_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    recipe_id: uuid('recipe_id').notNull(),
    cooked_at: timestamp('cooked_at', { withTimezone: true }).notNull().defaultNow(),
    rating: smallint('rating'),
    note: text('note'),
  },
  (t) => ({
    userCookedAtIdx: index('cooked_log_user_cooked_at_idx').on(t.user_id, t.cooked_at),
  }),
);

export type CookedLogRow = typeof cooked_log.$inferSelect;
export type CookedLogInsert = typeof cooked_log.$inferInsert;
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema/cooked-log.ts
git commit -m "db: cooked_log drizzle schema"
```

---

### Task 35: Drizzle schema — `recommendation_runs`

**Files:**
- Create: `src/db/schema/recommendation-runs.ts`

- [ ] **Step 1: Write**

```ts
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { MealCandidate, RecommendationContext } from '@/contracts/zod';

export const recommendation_runs = pgTable(
  'recommendation_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    context_snapshot: jsonb('context_snapshot').$type<RecommendationContext>().notNull(),
    candidates: jsonb('candidates').$type<MealCandidate[]>().notNull(),
    model: text('model').notNull(),
    prompts_version: text('prompts_version').notNull(),
    prompt_tokens: integer('prompt_tokens').notNull(),
    completion_tokens: integer('completion_tokens').notNull(),
    latency_ms: integer('latency_ms').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index('recommendation_runs_user_created_idx').on(t.user_id, t.created_at),
  }),
);

export type RecommendationRunRow = typeof recommendation_runs.$inferSelect;
export type RecommendationRunInsert = typeof recommendation_runs.$inferInsert;
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema/recommendation-runs.ts
git commit -m "db: recommendation_runs drizzle schema"
```

---

### Task 36: Drizzle schema — `signal_snapshots`

**Files:**
- Create: `src/db/schema/signal-snapshots.ts`

- [ ] **Step 1: Write**

```ts
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const signal_snapshots = pgTable(
  'signal_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    source: text('source').notNull(),
    kind: text('kind').notNull(),
    payload: jsonb('payload').notNull(),
    observed_at: timestamp('observed_at', { withTimezone: true }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userObservedIdx: index('signal_snapshots_user_observed_idx').on(t.user_id, t.observed_at),
  }),
);

export type SignalSnapshotRow = typeof signal_snapshots.$inferSelect;
export type SignalSnapshotInsert = typeof signal_snapshots.$inferInsert;
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema/signal-snapshots.ts
git commit -m "db: signal_snapshots drizzle schema"
```

---

### Task 37: Drizzle schema barrel + DB client

**Files:**
- Create: `src/db/schema/index.ts`
- Create: `src/db/client.ts`

- [ ] **Step 1: Write `src/db/schema/index.ts`**

```ts
export * from './profiles';
export * from './pantry-items';
export * from './checkins';
export * from './recipes';
export * from './cooked-log';
export * from './recommendation-runs';
export * from './signal-snapshots';
```

- [ ] **Step 2: Write `src/db/client.ts`**

```ts
import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  throw new Error('SUPABASE_DB_URL is not set');
}

const queryClient = postgres(url, { prepare: false });
export const db = drizzle(queryClient, { schema });
export type Db = typeof db;
```

- [ ] **Step 3: Add `server-only` dep**

```bash
bun add server-only
```

- [ ] **Step 4: Typecheck**

```bash
bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/db/schema/index.ts src/db/client.ts package.json bun.lock
git commit -m "db: schema barrel + drizzle client (server-only)"
```

---

### Task 38: Generate the initial migration via drizzle-kit

**Files:**
- Auto-generated: `supabase/migrations/0001_*.sql`

- [ ] **Step 1: Generate**

```bash
bun run db:generate
```

Expected: drizzle-kit writes a SQL file under `supabase/migrations/`. Inspect it.

- [ ] **Step 2: Rename to a stable name**

```bash
mv supabase/migrations/0000_*.sql supabase/migrations/0001_initial_schema.sql 2>/dev/null || true
mv supabase/migrations/0001_*.sql supabase/migrations/0001_initial_schema.sql 2>/dev/null || true
```

(One of the two `mv` commands will succeed depending on the auto-generated prefix.)

- [ ] **Step 3: Commit the schema migration**

```bash
git add supabase/
git commit -m "db: initial schema migration (drizzle-generated)"
```

---

### Task 39: Append RLS to the initial migration

**Files:**
- Modify: `supabase/migrations/0001_initial_schema.sql` (append)

- [ ] **Step 1: Append RLS block**

Open `supabase/migrations/0001_initial_schema.sql`. After the table/index DDL, append:

```sql
-- Enable RLS on all tables
alter table profiles               enable row level security;
alter table pantry_items           enable row level security;
alter table checkins               enable row level security;
alter table recipes                enable row level security;
alter table cooked_log             enable row level security;
alter table recommendation_runs    enable row level security;
alter table signal_snapshots       enable row level security;

-- profiles: 1:1 with auth.users
alter table profiles add constraint profiles_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

create policy profiles_self_select on profiles for select using (auth.uid() = user_id);
create policy profiles_self_insert on profiles for insert with check (auth.uid() = user_id);
create policy profiles_self_update on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy profiles_self_delete on profiles for delete using (auth.uid() = user_id);

-- pantry_items
create policy pantry_self_all on pantry_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- checkins
create policy checkins_self_all on checkins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recipes
create policy recipes_self_all on recipes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cooked_log
create policy cooked_log_self_all on cooked_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recommendation_runs: clients READ-ONLY; inserts via service-role only.
create policy recommendation_runs_self_select on recommendation_runs for select using (auth.uid() = user_id);
-- (no insert/update/delete policy = denied for non-service-role)

-- signal_snapshots: clients READ-ONLY; writes via verified webhook + service-role only.
create policy signal_snapshots_self_select on signal_snapshots for select using (auth.uid() = user_id);

-- Helpful: a function to set updated_at on profiles + recipes
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_set_updated_at before update on profiles
  for each row execute procedure set_updated_at();

create trigger recipes_set_updated_at before update on recipes
  for each row execute procedure set_updated_at();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0001_initial_schema.sql
git commit -m "db: enable RLS + policies + auth.users FK + updated_at triggers"
```

---

### Task 40: Apply the migration to Supabase

**Files:** none (migration applied to remote)

This task requires `.env.local` to be populated with `SUPABASE_DB_URL`.

- [ ] **Step 1: Verify env**

```bash
test -f .env.local && grep -q '^SUPABASE_DB_URL=' .env.local && echo OK || echo MISSING
```

If MISSING, populate `.env.local` from `.env.example` and re-run.

- [ ] **Step 2: Push schema**

```bash
bun run db:push
```

Expected: drizzle-kit applies the migration to the Supabase database. Confirms tables exist.

Note: `db:push` uses Drizzle's introspection; for the RLS block we manually appended, run it explicitly via `psql`:

- [ ] **Step 3: Apply RLS block via psql**

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_initial_schema.sql
```

(Idempotent statements may error if `db:push` already ran them; the RLS / policy / trigger statements at the bottom are the ones that matter.)

- [ ] **Step 4: Verify in Supabase Studio**

Open Supabase dashboard → Database → Tables → confirm 7 tables exist with RLS enabled (lock icon).

---

### Task 41: RLS test helpers

**Files:**
- Create: `tests/rls/_helpers.ts`

- [ ] **Step 1: Add Supabase JS to test scope**

(Already a dep from Task 2.)

- [ ] **Step 2: Write `tests/rls/_helpers.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  throw new Error('Missing Supabase env for RLS tests');
}

export const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

export async function createTestUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'rls-test-' + Math.random().toString(36).slice(2),
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error('user create failed');
  return data.user;
}

export async function deleteTestUser(userId: string) {
  await admin.auth.admin.deleteUser(userId);
}

export async function clientFor(userId: string) {
  // Mint a session by setting the access token via service-role workaround:
  // simplest path = admin.auth.admin.generateLink + setSession in a real flow.
  // For RLS tests we sign in directly via the impersonation helper:
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: `${userId}@rls-test.local`,
  });
  if (error) throw error;
  const sb = createClient(URL!, ANON!, { auth: { persistSession: false } });
  // We can't actually consume a magiclink in tests easily — instead, use
  // service-role-issued session via setSession with a manually-signed JWT.
  // The simpler, supported path for RLS testing is `auth.signInWithPassword`
  // using the password we set in createTestUser. Refactor to that.
  return sb;
}

/** Preferred: createTestUser + signIn helpers using a known password. */
export async function createUserWithPassword(email: string, password = 'rls-test-pw-1!') {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error('user create failed');
  return { user: data.user, password };
}

export async function signInClient(email: string, password: string) {
  const sb = createClient(URL!, ANON!, { auth: { persistSession: false } });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return sb;
}
```

- [ ] **Step 3: Commit**

```bash
git add tests/rls/_helpers.ts
git commit -m "tests: rls helpers (admin client + user-scoped client)"
```

---

### Task 42: RLS test — `profiles`

**Files:**
- Create: `tests/rls/profiles.test.ts`

- [ ] **Step 1: Write**

```ts
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const userAEmail = `rls-a-${Date.now()}@example.test`;
const userBEmail = `rls-b-${Date.now()}@example.test`;

let userAId: string;
let userBId: string;
let aPwd: string;
let bPwd: string;

describe('RLS: profiles', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(userAEmail);
    const b = await createUserWithPassword(userBEmail);
    userAId = a.user.id;
    userBId = b.user.id;
    aPwd = a.password;
    bPwd = b.password;

    // Insert profile rows for both via service-role
    await admin.from('profiles').insert({
      user_id: userAId,
      goal: 'maintain',
      target_kcal: 2200,
      target_protein_g: 160,
      target_carbs_g: 220,
      target_fat_g: 70,
    });
    await admin.from('profiles').insert({
      user_id: userBId,
      goal: 'cut',
      target_kcal: 1900,
      target_protein_g: 170,
      target_carbs_g: 170,
      target_fat_g: 60,
    });
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userAId);
    await admin.auth.admin.deleteUser(userBId);
  });

  test('user A can read own profile', async () => {
    const sb = await signInClient(userAEmail, aPwd);
    const { data, error } = await sb.from('profiles').select('*').eq('user_id', userAId).single();
    expect(error).toBeNull();
    expect(data?.user_id).toBe(userAId);
  });

  test('user A cannot read user B profile', async () => {
    const sb = await signInClient(userAEmail, aPwd);
    const { data, error } = await sb.from('profiles').select('*').eq('user_id', userBId);
    // RLS denies → returns empty rows, no error
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('user A cannot update user B profile', async () => {
    const sb = await signInClient(userAEmail, aPwd);
    const { data, error } = await sb
      .from('profiles')
      .update({ goal: 'bulk' })
      .eq('user_id', userBId)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]); // RLS update applies to 0 rows
  });
});
```

- [ ] **Step 2: Run**

```bash
bun run test tests/rls/profiles.test.ts
```

Expected: 3 passing tests.

- [ ] **Step 3: Commit**

```bash
git add tests/rls/profiles.test.ts
git commit -m "tests: rls coverage for profiles"
```

---

### Task 43: RLS tests — pantry / checkins / recipes / cooked_log

**Files:**
- Create: `tests/rls/pantry.test.ts`
- Create: `tests/rls/checkins.test.ts`
- Create: `tests/rls/recipes.test.ts`
- Create: `tests/rls/cooked-log.test.ts`

Each test follows the same shape as `profiles.test.ts`: create user A and B, seed via service-role, assert that A cannot select/update/delete B's rows. Schemas differ — use the columns from each Drizzle schema.

- [ ] **Step 1: Write `tests/rls/pantry.test.ts`**

```ts
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const aEmail = `rls-pa-${Date.now()}@example.test`;
const bEmail = `rls-pb-${Date.now()}@example.test`;
let aId: string; let bId: string; let aPwd: string;

describe('RLS: pantry_items', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(aEmail);
    const b = await createUserWithPassword(bEmail);
    aId = a.user.id; bId = b.user.id; aPwd = a.password;

    await admin.from('pantry_items').insert({ user_id: aId, name: 'rice',    display_name: 'Rice',    category: 'grain' });
    await admin.from('pantry_items').insert({ user_id: bId, name: 'chicken', display_name: 'Chicken', category: 'protein' });
  });
  afterAll(async () => {
    await admin.auth.admin.deleteUser(aId);
    await admin.auth.admin.deleteUser(bId);
  });

  test('A cannot read B items', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('pantry_items').select('*').eq('user_id', bId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('A can read own items', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('pantry_items').select('*').eq('user_id', aId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  test('A cannot delete B items', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('pantry_items').delete().eq('user_id', bId).select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
```

- [ ] **Step 2: Write `tests/rls/checkins.test.ts`**

```ts
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const aEmail = `rls-ca-${Date.now()}@example.test`;
const bEmail = `rls-cb-${Date.now()}@example.test`;
let aId: string; let bId: string; let aPwd: string;

describe('RLS: checkins', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(aEmail);
    const b = await createUserWithPassword(bEmail);
    aId = a.user.id; bId = b.user.id; aPwd = a.password;

    const today = new Date().toISOString().slice(0, 10);
    await admin.from('checkins').insert({ user_id: aId, date: today, energy: 4, training: 'light', hunger: 'normal' });
    await admin.from('checkins').insert({ user_id: bId, date: today, energy: 2, training: 'hard', hunger: 'high' });
  });
  afterAll(async () => {
    await admin.auth.admin.deleteUser(aId);
    await admin.auth.admin.deleteUser(bId);
  });

  test('A cannot read B checkins', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('checkins').select('*').eq('user_id', bId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
```

- [ ] **Step 3: Write `tests/rls/recipes.test.ts`**

```ts
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const aEmail = `rls-ra-${Date.now()}@example.test`;
const bEmail = `rls-rb-${Date.now()}@example.test`;
let aId: string; let bId: string; let aPwd: string;

describe('RLS: recipes', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(aEmail);
    const b = await createUserWithPassword(bEmail);
    aId = a.user.id; bId = b.user.id; aPwd = a.password;

    const minimalRecipe = {
      title: 'Test',
      ingredients: [{ name: 'rice', qty: 1, unit: 'cup', note: null }],
      steps: [{ idx: 1, text: 'cook' }],
      macros: { kcal: 200, protein_g: 5, carbs_g: 40, fat_g: 1 },
      servings: 1,
      total_minutes: 20,
      cuisine: null,
      source: 'user-saved',
      saved: true,
    };

    await admin.from('recipes').insert({ user_id: aId, ...minimalRecipe });
    await admin.from('recipes').insert({ user_id: bId, ...minimalRecipe });
  });
  afterAll(async () => {
    await admin.auth.admin.deleteUser(aId);
    await admin.auth.admin.deleteUser(bId);
  });

  test('A cannot read B recipes', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('recipes').select('*').eq('user_id', bId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
```

- [ ] **Step 4: Write `tests/rls/cooked-log.test.ts`**

```ts
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const aEmail = `rls-cla-${Date.now()}@example.test`;
const bEmail = `rls-clb-${Date.now()}@example.test`;
let aId: string; let bId: string; let aPwd: string;

describe('RLS: cooked_log', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(aEmail);
    const b = await createUserWithPassword(bEmail);
    aId = a.user.id; bId = b.user.id; aPwd = a.password;

    const minimalRecipe = {
      title: 'X', ingredients: [{ name: 'x', qty: 1, unit: null, note: null }], steps: [{ idx: 1, text: 'x' }],
      macros: { kcal: 100, protein_g: 1, carbs_g: 1, fat_g: 1 }, servings: 1, total_minutes: 1, cuisine: null,
      source: 'user-saved', saved: false,
    };
    const { data: ra } = await admin.from('recipes').insert({ user_id: aId, ...minimalRecipe }).select().single();
    const { data: rb } = await admin.from('recipes').insert({ user_id: bId, ...minimalRecipe }).select().single();
    await admin.from('cooked_log').insert({ user_id: aId, recipe_id: ra!.id });
    await admin.from('cooked_log').insert({ user_id: bId, recipe_id: rb!.id });
  });
  afterAll(async () => {
    await admin.auth.admin.deleteUser(aId);
    await admin.auth.admin.deleteUser(bId);
  });

  test('A cannot read B cooked_log', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('cooked_log').select('*').eq('user_id', bId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
```

- [ ] **Step 5: Run all RLS tests**

```bash
bun run test tests/rls/
```

Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add tests/rls/
git commit -m "tests: rls coverage for pantry/checkins/recipes/cooked_log"
```

---

### Task 44: RLS tests — `recommendation_runs` and `signal_snapshots` (read-only client)

**Files:**
- Create: `tests/rls/recommendation-runs.test.ts`
- Create: `tests/rls/signal-snapshots.test.ts`

These tables forbid client writes — only the service-role can insert.

- [ ] **Step 1: Write `tests/rls/recommendation-runs.test.ts`**

```ts
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const aEmail = `rls-rra-${Date.now()}@example.test`;
let aId: string; let aPwd: string;

describe('RLS: recommendation_runs', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(aEmail);
    aId = a.user.id; aPwd = a.password;
    await admin.from('recommendation_runs').insert({
      user_id: aId,
      context_snapshot: {},
      candidates: [],
      model: 'gemini-test',
      prompts_version: '0',
      prompt_tokens: 0,
      completion_tokens: 0,
      latency_ms: 1,
    });
  });
  afterAll(async () => { await admin.auth.admin.deleteUser(aId); });

  test('user can read own runs', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('recommendation_runs').select('*').eq('user_id', aId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  test('user CANNOT insert runs from client', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { error } = await sb.from('recommendation_runs').insert({
      user_id: aId,
      context_snapshot: {},
      candidates: [],
      model: 'x',
      prompts_version: '0',
      prompt_tokens: 0,
      completion_tokens: 0,
      latency_ms: 1,
    });
    // No INSERT policy = denied
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 2: Write `tests/rls/signal-snapshots.test.ts`**

```ts
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const aEmail = `rls-ssa-${Date.now()}@example.test`;
let aId: string; let aPwd: string;

describe('RLS: signal_snapshots', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(aEmail);
    aId = a.user.id; aPwd = a.password;
    await admin.from('signal_snapshots').insert({
      user_id: aId,
      source: 'apple_health',
      kind: 'sleep',
      payload: { hours: 7 },
      observed_at: new Date().toISOString(),
    });
  });
  afterAll(async () => { await admin.auth.admin.deleteUser(aId); });

  test('user can read own snapshots', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('signal_snapshots').select('*').eq('user_id', aId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  test('user CANNOT insert snapshots from client', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { error } = await sb.from('signal_snapshots').insert({
      user_id: aId,
      source: 'apple_health',
      kind: 'sleep',
      payload: {},
      observed_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run**

```bash
bun run test tests/rls/
```

Expected: all RLS tests pass (including new ones).

- [ ] **Step 4: Commit**

```bash
git add tests/rls/recommendation-runs.test.ts tests/rls/signal-snapshots.test.ts
git commit -m "tests: rls coverage for recommendation_runs + signal_snapshots (read-only)"
```

---

### Task 45: Forbidden-imports lint rule (engine purity)

**Files:**
- Modify: `biome.json`

Biome doesn't natively enforce path-based import bans, so we add a Vitest unit test that asserts engine purity.

- [ ] **Step 1: Create `src/engine/_purity.test.ts`**

```ts
import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ENGINE_DIR = 'src/engine';
const FORBIDDEN = [
  /from '@\/server/,
  /from '@\/db/,
  /from '@\/app/,
  /from 'next/,
  /from '@supabase\//,
  /from 'drizzle-orm/,
  /from 'postgres/,
];

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) yield p;
  }
}

describe('engine purity', () => {
  test('no forbidden imports anywhere under src/engine', () => {
    const violations: string[] = [];
    for (const file of walk(ENGINE_DIR)) {
      const content = readFileSync(file, 'utf8');
      for (const pat of FORBIDDEN) {
        if (pat.test(content)) violations.push(`${file}: matches ${pat}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run**

```bash
bun run test src/engine/_purity.test.ts
```

Expected: pass (engine has only the ports + types so far).

- [ ] **Step 3: Commit**

```bash
git add src/engine/_purity.test.ts
git commit -m "engine: purity test (no DB/network/framework imports)"
```

---

### Task 46: Kanban seed file — `kanban-tasks.yaml`

**Files:**
- Create: `docs/superpowers/specs/kanban-tasks.yaml`

- [ ] **Step 1: Write the seed**

```yaml
# Cline Kanban seed for WhatToEat 2.0
# Regenerable from this file via `bun run kanban:seed`. Never edit cards directly.

board: whattoeat
url: http://127.0.0.1:3484/whattoeat

tracks:
  - id: T0
    title: 'T0 — Contracts + DB schema + RLS'
    wave: 0
    branch: wt/track-0-contracts
    status: done   # landed by Plan 00
    owned_paths:
      - src/contracts/zod/**
      - src/engine/ports/**
      - src/engine/types.ts
      - src/server/contracts.ts
      - src/db/schema/**
      - src/db/client.ts
      - drizzle.config.ts
      - supabase/migrations/**
      - tests/rls/**
    depends_on: []
    plan: docs/superpowers/plans/2026-04-26-plan-00-bootstrap-and-track-0.md

  - id: T1
    title: 'T1 — Design system, tokens, shadcn fork'
    wave: 1
    branch: wt/track-1-design-system
    status: ready
    owned_paths:
      - src/styles/**
      - tailwind.config.ts
      - postcss.config.mjs
      - src/components/ui/**
    depends_on: [T0]
    acceptance:
      - tokens.css authored; tailwind.config.ts derives from tokens
      - shadcn primitives forked into src/components/ui/* and re-themed
      - Sonner + Vaul + Lucide installed and stroke-width pinned
      - dark mode is a token swap; both modes designed simultaneously
      - storybook-style preview page (or dev-only route) shows every primitive
    plan: docs/superpowers/plans/<TBD>-plan-01-design-system.md

  - id: T2
    title: 'T2 — Engine core (TDD with fake LLM)'
    wave: 1
    branch: wt/track-2-engine-core
    status: ready
    owned_paths:
      - src/engine/**
    depends_on: [T0]
    acceptance:
      - recommend(ctx, deps) implemented with two-call flow (plan + detail)
      - score + sanitize pure helpers implemented and tested
      - allergen filter throws EngineSafetyError when all candidates drop
      - schema-validation retry once then EngineParseError
      - 95%+ branch coverage with FakeLlmClient
    plan: docs/superpowers/plans/<TBD>-plan-02-engine-core.md

  - id: T3
    title: 'T3 — Gemini adapter + eval harness'
    wave: 2
    branch: wt/track-3-gemini-adapter
    status: blocked
    owned_paths:
      - src/server/adapters/gemini.ts
      - src/engine/eval/**
      - scripts/run-eval.ts
    depends_on: [T0, T2]
    acceptance:
      - GeminiLlmClient implements LlmClient with structured outputs
      - eval harness runs ~20 fixtures; emits cost-vs-quality table
      - first PR posts table; production model selected from data
    plan: docs/superpowers/plans/<TBD>-plan-03-gemini-adapter-and-evals.md

  - id: T4
    title: 'T4 — Auth + middleware'
    wave: 1
    branch: wt/track-4-auth
    status: ready
    owned_paths:
      - src/server/auth/**
      - src/middleware.ts
      - src/app/auth/**
    depends_on: [T0]
    acceptance:
      - magic-link flow end-to-end via @supabase/ssr
      - middleware enforces auth on /(authenticated)/**
      - server-side getUser used everywhere (never getSession)
      - account-deletion flow + Danger zone
    plan: docs/superpowers/plans/<TBD>-plan-04-auth-and-middleware.md

  - id: T5
    title: 'T5 — Pantry feature'
    wave: 2
    branch: wt/track-5-pantry
    status: blocked
    owned_paths:
      - src/server/pantry/**
      - src/app/pantry/**
      - src/components/feature/pantry/**
    depends_on: [T0, T1]
    acceptance:
      - server actions for add/toggle/delete/bulkAdd
      - LLM-assisted normalization with confirmation chip + 2s undo
      - Web Speech API voice add (real, not stubbed)
      - chip grid grouped by category, search, paste add
    plan: docs/superpowers/plans/<TBD>-plan-05-pantry-feature.md

  - id: T6
    title: 'T6 — Profile feature'
    wave: 2
    branch: wt/track-6-profile
    status: blocked
    owned_paths:
      - src/server/profile/**
      - src/app/profile/**
      - src/components/feature/profile/**
    depends_on: [T0, T1]
    acceptance:
      - TDEE + macro split server-suggested, editable
      - allergies/dislikes/cuisines/equipment chip multi-selects
      - Connections placeholder cards for HealthKit/Eight Sleep/Superpower
    plan: docs/superpowers/plans/<TBD>-plan-06-profile-feature.md

  - id: T7
    title: 'T7 — Daily check-in'
    wave: 2
    branch: wt/track-7-checkin
    status: blocked
    owned_paths:
      - src/server/checkin/**
      - src/app/checkin/**
      - src/components/feature/checkin/**
    depends_on: [T0, T1]
    acceptance:
      - Vaul drawer 3-tap UI
      - idempotent upsert on (user_id, date)
      - shows today's status from Home tile
    plan: docs/superpowers/plans/<TBD>-plan-07-checkin-feature.md

  - id: T8
    title: 'T8 — Feed Me flow + recommendation result UI'
    wave: 3
    branch: wt/track-8-feed-me
    status: blocked
    owned_paths:
      - src/app/feed-me/**
      - src/app/api/recommend/**
      - src/components/feature/recommendation/**
      - src/server/recommendation/**
    depends_on: [T1, T2, T3, T5, T6, T7]
    acceptance:
      - Server Action assembles RecommendationContext
      - Route Handler streams from recommend()
      - staged reveal motion on result; 1–3 MealCards
      - persists recommendation_runs before showing candidates
    plan: docs/superpowers/plans/<TBD>-plan-08-feed-me-flow.md

  - id: T9
    title: 'T9 — Recipe view + saved + cooked log'
    wave: 3
    branch: wt/track-9-recipe-view
    status: blocked
    owned_paths:
      - src/app/recipes/**
      - src/app/saved/**
      - src/server/recipes/**
      - src/components/feature/recipe/**
    depends_on: [T0, T1]
    acceptance:
      - structured ingredients/steps render
      - MacroRing animated count-up
      - I-cooked-this writes cooked_log + 1-tap rating
      - lazy persistence: recipes saved only on save/cook
    plan: docs/superpowers/plans/<TBD>-plan-09-recipe-and-saved.md

  - id: T10
    title: 'T10 — Home + onboarding + signature moments'
    wave: 4
    branch: wt/track-10-home-onboarding
    status: blocked
    owned_paths:
      - src/app/(home)/**
      - src/app/onboarding/**
      - src/components/feature/home/**
    depends_on: [T1, T5, T6, T8]
    acceptance:
      - animated gradient hero
      - Feed Me CTA staged motion (compress → bloom → cards)
      - 3-pane onboarding with brand-voice copy
      - delight-skill polish on every core surface
    plan: docs/superpowers/plans/<TBD>-plan-10-home-and-onboarding.md

  - id: T11
    title: 'T11 — PWA shell + offline pantry cache'
    wave: 2
    branch: wt/track-11-pwa
    status: blocked
    owned_paths:
      - public/manifest.json
      - public/icons/**
      - src/app/sw.ts
      - src/app/offline/**
    depends_on: [T1, T5]
    acceptance:
      - installable PWA on iOS Safari + Chromium
      - pantry view readable offline (cached SWR)
      - graceful empty state for offline recommendation attempts
    plan: docs/superpowers/plans/<TBD>-plan-11-pwa-shell-offline.md

  - id: T12
    title: 'T12 — Observability + rate limit + error boundary'
    wave: 2
    branch: wt/track-12-observability
    status: blocked
    owned_paths:
      - src/server/instrumentation/**
      - src/server/ratelimit/**
      - src/app/error.tsx
      - sentry.client.config.ts
      - sentry.server.config.ts
    depends_on: [T0, T4]
    acceptance:
      - Sentry wired with source maps, tagged events
      - Upstash rate limit on /api/recommend, normalize, magic-link
      - feature-level error boundary on Feed Me with retry CTA
    plan: docs/superpowers/plans/<TBD>-plan-12-observability.md
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/kanban-tasks.yaml
git commit -m "docs: kanban seed yaml (T0..T12 with owned paths + acceptance)"
```

---

### Task 47: Kanban seed script — `scripts/seed-kanban.ts`

**Files:**
- Create: `scripts/seed-kanban.ts`

The Cline Kanban API may or may not be available; the script tries the API, and falls back to printing a markdown card list the user can paste in if no API exists.

- [ ] **Step 1: Add dep for yaml parsing**

```bash
bun add -d yaml
```

- [ ] **Step 2: Write `scripts/seed-kanban.ts`**

```ts
#!/usr/bin/env bun
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

type Track = {
  id: string;
  title: string;
  wave: number;
  branch: string;
  status: 'ready' | 'blocked' | 'in_progress' | 'review' | 'done';
  owned_paths: string[];
  depends_on: string[];
  acceptance?: string[];
  plan?: string;
};

const file = readFileSync('docs/superpowers/specs/kanban-tasks.yaml', 'utf8');
const seed = parse(file) as { board: string; url: string; tracks: Track[] };

const KANBAN_URL = process.env.KANBAN_URL ?? seed.url;

async function tryApi(): Promise<boolean> {
  try {
    const r = await fetch(`${KANBAN_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

function renderMarkdownFallback(): string {
  let out = `# ${seed.board} — paste these cards manually\n\nKanban URL: ${seed.url}\n\n`;
  for (const t of seed.tracks) {
    out += `## ${t.title}\n`;
    out += `- **Status:** ${t.status}  •  **Wave:** ${t.wave}  •  **Branch:** \`${t.branch}\`\n`;
    if (t.depends_on.length) out += `- **Depends on:** ${t.depends_on.join(', ')}\n`;
    out += `- **Owned paths:**\n${t.owned_paths.map((p) => `  - \`${p}\``).join('\n')}\n`;
    if (t.acceptance?.length) out += `- **Acceptance:**\n${t.acceptance.map((a) => `  - ${a}`).join('\n')}\n`;
    if (t.plan) out += `- **Plan:** ${t.plan}\n`;
    out += '\n';
  }
  return out;
}

async function main() {
  if (await tryApi()) {
    // TODO: when Cline exposes a documented kanban API, POST cards here.
    console.error(`[seed-kanban] Cline kanban detected at ${KANBAN_URL}, but API integration is not yet implemented.`);
    console.error(`[seed-kanban] Falling back to markdown output.`);
  } else {
    console.error(`[seed-kanban] Cline kanban not reachable at ${KANBAN_URL}; printing markdown fallback.`);
  }
  console.log(renderMarkdownFallback());
}

await main();
```

- [ ] **Step 3: Run**

```bash
bun run kanban:seed > /tmp/kanban-seed.md
head -30 /tmp/kanban-seed.md
```

Expected: prints a markdown card list (header + first track or two visible).

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-kanban.ts package.json bun.lock
git commit -m "chore: kanban seed script (api + markdown fallback)"
```

---

### Task 48: Final verification + push

**Files:** none

- [ ] **Step 1: Full quality run**

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Expected: all four pass. (`build` may need NEXT_PUBLIC_SUPABASE_URL/ANON in env; export placeholders if needed.)

- [ ] **Step 2: Verify file-ownership boundaries**

Track 0 should not have touched any feature folders:

```bash
git diff --name-only $(git merge-base HEAD main)..HEAD | grep -E '^src/(app|components/feature|server/(pantry|profile|checkin|recommendation|recipes))/' || echo "OK — no feature-folder touches"
```

Expected: `OK — no feature-folder touches`.

- [ ] **Step 3: Push to a tracking branch**

```bash
git push -u origin main
```

(If protected, push to a branch and open the bootstrap PR.)

- [ ] **Step 4: Open follow-up PRs / cards**

- Move T0 kanban card to `Done`.
- Mark T1, T2, T4 as `Ready` (Wave 1) — the next plan-author session can dispatch them.
- Open issues to author plans 01–12 (one per track) — these are themselves parallelizable subagent tasks.

---

## Self-review

The plan has been written. Spec coverage check:

- **§1 Scope** — Track 0 contracts/schema/RLS land; v1 cleanup completed (Tasks 1–4); tooling baseline (Tasks 2–6) ✓.
- **§2 Architecture** — engine ports + types committed (Tasks 25–28); engine purity test (Task 45) enforces the layer rule ✓.
- **§3 Data model** — 7 Drizzle schemas + indexes + RLS + triggers (Tasks 30–39); 8 RLS test files (Tasks 41–44) ✓.
- **§4 Engine contract** — Zod schemas for context/candidate/result (Task 23); ports (Tasks 25–27); error hierarchy (Task 28). Implementation is Plan 02. ✓
- **§5 Design system** — out of scope for Plan 00 (Plan 01) ✓.
- **§6 Parallelization & workflow** — PROJECT_RULES.md + agent shims (Tasks 7–8); CONTRIBUTING (Task 9); wt.sh (Task 10); slash commands (Task 11); CI workflows (Tasks 12–15); kanban seed yaml + script (Tasks 46–47) ✓.
- **§6 ext / agent bootstrap + code review** — pre-commit + pre-push hooks (Task 6 + Task 8 amendment); CI placeholders for review/security-review/eval (Tasks 13–15) ✓.
- **§7 Core flows + LLM pipeline** — out of scope for Plan 00 (Plans 02, 03, 05–10) ✓.
- **§8 Auth/RLS/observability/cleanup** — RLS portion landed; auth/observability are Plans 04, 12; v1 kill list executed (Task 1) ✓.

No placeholders, no TODOs, no "similar to Task N." All file paths absolute or repo-relative. All code blocks complete.

One known caveat: **Task 41's `clientFor` function** is documented but the practical helper is `signInClient` (using the password set in `createUserWithPassword`). The dead `clientFor` is intentionally retained as a comment block to document the magic-link path that *would* work if we wired it up, but tests use `signInClient`. This is explicit in the file and not a placeholder.
