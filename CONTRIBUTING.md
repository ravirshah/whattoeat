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
