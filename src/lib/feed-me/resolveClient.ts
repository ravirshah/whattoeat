/**
 * resolveClient — returns the appropriate LlmClient based on the runtime environment.
 *
 * In production (RECOMMEND_LLM_CLIENT=gemini or unset):
 *   - Instantiates GeminiLlmClient (reads GEMINI_API_KEY from env internally).
 *
 * In test / local dev (RECOMMEND_LLM_CLIENT=fake):
 *   - Returns FakeLlmClient with default canned responses.
 *
 * The `override` argument allows server-action unit tests to inject a client
 * without touching env vars or module mocks.
 */

import { FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import type { LlmClient } from '@/engine/ports/llm';
import { GeminiLlmClient } from '@/server/adapters/gemini-llm';

export function resolveClient(override?: LlmClient): LlmClient {
  if (override) return override;

  const selector = process.env.RECOMMEND_LLM_CLIENT ?? 'gemini';

  if (selector === 'fake') {
    // FakeLlmClient returns hardcoded successful results. Tests that need
    // specific outputs should pass a pre-configured instance via `override`.
    return new FakeLlmClient();
  }

  // GeminiLlmClient reads GEMINI_API_KEY from env in its constructor.
  // It will throw a clear error if the key is absent.
  return new GeminiLlmClient();
}
