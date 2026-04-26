import { formatMarkdownReport, runEval } from './harness';

const isCi = process.argv.includes('--ci');

const report = await runEval();

if (isCi) {
  // In CI, output the markdown report for PR comment posting.
  process.stdout.write(`${formatMarkdownReport(report)}
`);
} else {
  // Local: human-readable summary.
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
