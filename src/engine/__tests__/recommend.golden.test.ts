import { cuttingDayCtx } from '@/engine/__fixtures__/contexts';
import { FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { recommend } from '@/engine/recommend';
import { describe, expect, test } from 'vitest';

describe('recommend — golden path', () => {
  test('returns ok result with candidates and rationale', async () => {
    const result = await recommend(cuttingDayCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.value.candidates.length).toBeLessThanOrEqual(
      cuttingDayCtx.request.candidateCount,
    );
    expect(result.value.rationale).toBeTruthy();
    expect(result.value.modelUsed).toBe('fake-llm-v1');
    expect(result.value.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.value.tokens.prompt).toBeGreaterThan(0);
  });

  test('candidates are sorted — highest pantryCoverage first when macros equal', async () => {
    const result = await recommend(cuttingDayCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const coverages = result.value.candidates.map((c) => c.pantryCoverage);
    for (let i = 1; i < coverages.length; i++) {
      // Sorted descending (higher is better), allow ties
      expect(coverages[i - 1]).toBeGreaterThanOrEqual(coverages[i] ?? 0);
    }
  });

  test('candidateCount cap is respected', async () => {
    const ctx = { ...cuttingDayCtx, request: { ...cuttingDayCtx.request, candidateCount: 2 } };
    const result = await recommend(ctx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeLessThanOrEqual(2);
  });
});
