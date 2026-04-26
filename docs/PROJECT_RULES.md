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
