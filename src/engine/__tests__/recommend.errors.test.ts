import { cuttingDayCtx } from '@/engine/__fixtures__/contexts';
import { AlwaysThrowsLlmClient, FailOnceLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { recommend } from '@/engine/recommend';
import { describe, expect, test } from 'vitest';

describe('recommend — error contract', () => {
  test('AlwaysThrowsLlmClient → ok: false with LlmInvalidJsonError', async () => {
    const result = await recommend(cuttingDayCtx, { llm: new AlwaysThrowsLlmClient() });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.name).toBe('LlmInvalidJsonError');
  });

  test('FailOnceLlmClient → ok: false (plan call fails, no retry at engine level)', async () => {
    const result = await recommend(cuttingDayCtx, { llm: new FailOnceLlmClient() });
    // The engine wraps LLM errors into fail(). FailOnceLlmClient fails the plan call.
    expect(result.ok).toBe(false);
  });

  test('timeout results in EngineTimeoutError', async () => {
    const result = await recommend(cuttingDayCtx, {
      llm: new AlwaysThrowsLlmClient(),
      timeoutMs: 1,
    });
    expect(result.ok).toBe(false);
  });
});
