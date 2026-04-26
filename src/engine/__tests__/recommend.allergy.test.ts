import { allergyCtx } from '@/engine/__fixtures__/contexts';
import { AllergenDetailFakeClient, FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { recommend } from '@/engine/recommend';
import { describe, expect, test } from 'vitest';

describe('recommend — allergy filtering', () => {
  test('drops candidates that contain allergen ingredients', async () => {
    // AllergenDetailFakeClient returns peanut butter in every detail
    const result = await recommend(allergyCtx, { llm: new AllergenDetailFakeClient() });
    // All allergen candidates dropped → EngineNoCandidatesError
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.name).toBe('EngineNoCandidatesError');
  });

  test('non-allergen candidate passes through', async () => {
    // FakeLlmClient returns allergen-free ingredients
    const result = await recommend(allergyCtx, { llm: new FakeLlmClient() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const c of result.value.candidates) {
      for (const ing of c.ingredients) {
        expect(ing.name.toLowerCase()).not.toContain('peanut');
      }
    }
  });
});
