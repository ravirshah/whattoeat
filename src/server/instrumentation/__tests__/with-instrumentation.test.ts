import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Sentry before importing the module under test.
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((cb: (scope: unknown) => void) => cb(mockScope)),
  captureException: vi.fn(),
  setTag: vi.fn(),
  setExtra: vi.fn(),
}));

const mockScope = {
  setTag: vi.fn(),
  setExtra: vi.fn(),
};

import { withInstrumentation } from '@/server/instrumentation/with-instrumentation';
import * as Sentry from '@sentry/nextjs';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('withInstrumentation', () => {
  it('returns the wrapped action result on success', async () => {
    const action = vi.fn().mockResolvedValue({ data: 42 });
    const wrapped = withInstrumentation('test.action', action);
    const result = await wrapped('arg1');
    expect(result).toEqual({ data: 42 });
    expect(action).toHaveBeenCalledWith('arg1');
  });

  it('sets Sentry tags on success', async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const wrapped = withInstrumentation('pantry.add', action);
    await wrapped();
    expect(mockScope.setTag).toHaveBeenCalledWith('action', 'pantry.add');
  });

  it('calls captureException and re-throws on error', async () => {
    const boom = new Error('test explosion');
    const action = vi.fn().mockRejectedValue(boom);
    const wrapped = withInstrumentation('engine.recommend', action);

    await expect(wrapped()).rejects.toThrow('test explosion');
    expect(Sentry.captureException).toHaveBeenCalledWith(boom);
  });

  it('records latency as a Sentry extra', async () => {
    vi.useFakeTimers();
    const action = vi.fn().mockImplementation(() => new Promise((res) => setTimeout(res, 50)));
    const wrapped = withInstrumentation('slow.action', action);
    const p = wrapped();
    vi.advanceTimersByTime(50);
    await p;
    expect(mockScope.setExtra).toHaveBeenCalledWith('latencyMs', expect.any(Number));
    vi.useRealTimers();
  });

  it('allows an optional userId tag', async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const wrapped = withInstrumentation('foo.bar', action, { userId: 'u-123' });
    await wrapped();
    expect(mockScope.setTag).toHaveBeenCalledWith('userId', 'u-123');
  });
});
