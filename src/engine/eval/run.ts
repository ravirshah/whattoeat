import type { EvalMode } from './harness';

// ---------------------------------------------------------------------------
// Mode helpers — exported for unit testing and scripts/run-eval.ts
// ---------------------------------------------------------------------------

export type { EvalMode };

export function parseMode(argv: string[]): EvalMode {
  const flag = argv.find((a) => a.startsWith('--mode='));
  if (!flag) return 'fake';
  const value = flag.slice('--mode='.length);
  if (value !== 'fake' && value !== 'real') {
    throw new Error(`Invalid mode: "${value}". Expected "fake" or "real".`);
  }
  return value;
}

export function shouldSkipReal(): boolean {
  return !process.env.GEMINI_API_KEY;
}
