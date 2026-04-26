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
  } catch {
    return false;
  }
}

function renderMarkdownFallback(): string {
  let out = `# ${seed.board} — paste these cards manually\n\nKanban URL: ${seed.url}\n\n`;
  for (const t of seed.tracks) {
    out += `## ${t.title}\n`;
    out += `- **Status:** ${t.status}  •  **Wave:** ${t.wave}  •  **Branch:** \`${t.branch}\`\n`;
    if (t.depends_on.length) out += `- **Depends on:** ${t.depends_on.join(', ')}\n`;
    out += `- **Owned paths:**\n${t.owned_paths.map((p) => `  - \`${p}\``).join('\n')}\n`;
    if (t.acceptance?.length)
      out += `- **Acceptance:**\n${t.acceptance.map((a) => `  - ${a}`).join('\n')}\n`;
    if (t.plan) out += `- **Plan:** ${t.plan}\n`;
    out += '\n';
  }
  return out;
}

async function main() {
  if (await tryApi()) {
    // TODO: when Cline exposes a documented kanban API, POST cards here.
    console.error(
      `[seed-kanban] Cline kanban detected at ${KANBAN_URL}, but API integration is not yet implemented.`,
    );
    console.error('[seed-kanban] Falling back to markdown output.');
  } else {
    console.error(
      `[seed-kanban] Cline kanban not reachable at ${KANBAN_URL}; printing markdown fallback.`,
    );
  }
  process.stdout.write(`${renderMarkdownFallback()}\n`);
}

await main();
