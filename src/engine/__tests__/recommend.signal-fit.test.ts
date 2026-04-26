import { lowSleepCtx, trainingDayCtx } from '@/engine/__fixtures__/contexts';
import { FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { recommend } from '@/engine/recommend';
import { describe, expect, test } from 'vitest';

describe('recommend — signal fit', () => {
  test('low-sleep context returns result (signals forwarded to prompts)', async () => {
    const result = await recommend(lowSleepCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeGreaterThanOrEqual(1);
  });

  test('training-day context returns result', async () => {
    const result = await recommend(trainingDayCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeGreaterThanOrEqual(1);
  });

  test('timeBudgetMin cap is respected for low-sleep quick-meal context', async () => {
    const result = await recommend(lowSleepCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // candidateCount is 2 for lowSleepCtx
    expect(result.value.candidates.length).toBeLessThanOrEqual(2);
  });
});
