import { barePantryCtx, cuttingDayCtx } from '@/engine/__fixtures__/contexts';
import { FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { recommend } from '@/engine/recommend';
import { describe, expect, test } from 'vitest';

describe('recommend — pantry coverage', () => {
  test('candidates include pantryCoverage field in [0, 1]', async () => {
    const result = await recommend(cuttingDayCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const c of result.value.candidates) {
      expect(c.pantryCoverage).toBeGreaterThanOrEqual(0);
      expect(c.pantryCoverage).toBeLessThanOrEqual(1);
    }
  });

  test('bare pantry still returns candidates (LLM is responsible for pantryFit)', async () => {
    const result = await recommend(barePantryCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeGreaterThanOrEqual(1);
  });
});
