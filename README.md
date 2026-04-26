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
