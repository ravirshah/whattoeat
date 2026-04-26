// Entry point: engine-eval.yml calls `bun scripts/run-eval.ts [--mode=real|fake] [--ci]`
import { formatMarkdownReport, runEval } from '@/engine/eval/harness';
import { parseMode, shouldSkipReal } from '@/engine/eval/run';

const isCi = process.argv.includes('--ci');
const mode = parseMode(process.argv.slice(2));

let report: Awaited<ReturnType<typeof runEval>>;

if (mode === 'real') {
  if (shouldSkipReal()) {
    console.warn(
      '[eval] Skipping real-mode eval: GEMINI_API_KEY is not set. ' +
        'Set it in .env.local and re-run with --mode=real.',
    );
    process.exit(0);
  }
  // Dynamic import avoids loading the Gemini SDK during fake-mode CI runs.
  const { GeminiLlmClient } = await import('@/server/adapters/gemini-llm');
  report = await runEval(new GeminiLlmClient(), { mode: 'real' });
} else {
  // Default: fake mode — harness creates per-entry FakeLlmClient instances
  // with correct timeBudget. No GEMINI_API_KEY required.
  report = await runEval(undefined, { mode: 'fake' });
}

if (isCi) {
  process.stdout.write(`${formatMarkdownReport(report)}\n`);
} else {
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
