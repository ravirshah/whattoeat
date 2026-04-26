import { describe, expect, it, vi } from 'vitest';

/**
 * These tests verify that run.ts correctly parses the --mode flag and
 * skips real-mode runs when GEMINI_API_KEY is absent. They import only
 * the parsing/config helpers, NOT the side-effectful runEval() function.
 */
import { parseMode, shouldSkipReal } from '@/engine/eval/run';

describe('parseMode', () => {
  it('defaults to "fake" when no --mode flag is present', () => {
    expect(parseMode([])).toBe('fake');
  });

  it('returns "fake" when --mode=fake', () => {
    expect(parseMode(['--mode=fake'])).toBe('fake');
  });

  it('returns "real" when --mode=real', () => {
    expect(parseMode(['--mode=real'])).toBe('real');
  });

  it('throws on an unrecognised mode value', () => {
    expect(() => parseMode(['--mode=turbo'])).toThrow(/Invalid mode/i);
  });
});

describe('shouldSkipReal', () => {
  it('returns false when GEMINI_API_KEY is set', () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    expect(shouldSkipReal()).toBe(false);
    vi.unstubAllEnvs();
  });

  it('returns true when GEMINI_API_KEY is not set', () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    expect(shouldSkipReal()).toBe(true);
    vi.unstubAllEnvs();
  });
});
