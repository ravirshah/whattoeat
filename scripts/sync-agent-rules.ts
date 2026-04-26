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
