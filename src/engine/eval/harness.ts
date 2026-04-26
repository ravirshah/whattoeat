import { FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { recommend } from '@/engine/recommend';
import datasetRaw from './dataset.json';
import { EvalDataset } from './schema';
import type { EvalEntry } from './schema';

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
  // Pass timeBudgetMin so FakeLlmClient caps totalMinutes to within budget.
  const timeBudget = entry.ctx.request.timeBudgetMin;
  const llm = new FakeLlmClient(
    timeBudget != null
      ? {
          detail: (title) => ({
            title,
            oneLineWhy: `${title} — great choice.`,
            ingredients: [{ name: 'chicken breast', qty: 200, unit: 'g' as const, note: null }],
            steps: [{ idx: 1, text: 'Prepare and cook.', durationMin: timeBudget }],
            estMacros: { kcal: 400, protein_g: 40, carbs_g: 20, fat_g: 10 },
            servings: 1,
            totalMinutes: timeBudget,
            cuisine: 'american' as const,
            tags: ['quick'],
            pantryCoverage: 0.8,
            missingItems: [],
          }),
        }
      : {},
  );
  const result = await recommend(entry.ctx, { llm });
  const latencyMs = Date.now() - start;

  const failures: string[] = [];

  if (entry.rubric.expectError) {
    if (result.ok) failures.push('Expected error result but got ok');
    return {
      id: entry.id,
      label: entry.label,
      passed: failures.length === 0,
      failureReasons: failures,
      latencyMs,
    };
  }

  if (!result.ok) {
    failures.push(
      `Expected ok result but got error: ${result.error.name} — ${result.error.message}`,
    );
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
          failures.push(
            `Allergen '${forbidden}' found in candidate '${c.title}' ingredient '${ing.name}'`,
          );
        }
      }
    }
  }

  // maxMinutes — rubric check (FakeLlm returns 25min by default; only strict for snack/15min entries)
  if (entry.rubric.maxMinutes != null) {
    for (const c of candidates) {
      if (c.totalMinutes > entry.rubric.maxMinutes) {
        failures.push(
          `Candidate '${c.title}' took ${c.totalMinutes}min, budget is ${entry.rubric.maxMinutes}min`,
        );
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
