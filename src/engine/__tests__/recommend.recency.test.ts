import { RECENCY_RECENT_TITLE, recencyCtx } from '@/engine/__fixtures__/contexts';
import { FakeLlmClient } from '@/engine/__fixtures__/llm-fakes';
import { recommend } from '@/engine/recommend';
import { describe, expect, test } from 'vitest';

describe('recommend — recency filtering', () => {
  test('recently cooked title is de-prioritised (not first)', async () => {
    const result = await recommend(recencyCtx, {
      llm: new FakeLlmClient(),
      recentCookTitles: [RECENCY_RECENT_TITLE],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const firstTitle = result.value.candidates[0]?.title;
    // The recently cooked meal should not be the first pick if alternatives exist
    if (result.value.candidates.length > 1) {
      expect(firstTitle).not.toBe(RECENCY_RECENT_TITLE);
    }
  });

  test('recency soft-filter keeps at least one candidate', async () => {
    // Even if the only concept matches recent title, we still return something
    const result = await recommend(recencyCtx, {
      llm: new FakeLlmClient(),
      recentCookTitles: [
        'Grilled Chicken & Rice',
        'Greek Yogurt Parfait',
        'Egg & Veggie Scramble',
        'Tuna Salad Wrap',
        'Oats with Almond Butter',
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.candidates.length).toBeGreaterThanOrEqual(1);
  });
});
