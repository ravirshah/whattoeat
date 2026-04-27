import { cuttingDayCtx } from '@/engine/__fixtures__/contexts';
import { buildDetailPrompt, buildPlanPrompt } from '@/engine/prompt';
import { describe, expect, test } from 'vitest';

describe('prompt builders — dietary_pattern', () => {
  test('system prompt includes the DIETARY PATTERN block', () => {
    const { system } = buildPlanPrompt(cuttingDayCtx);
    expect(system).toMatch(/DIETARY PATTERN/);
    expect(system).toMatch(/VEGETARIAN \/ VEGAN PROTEIN-DENSITY RULES/);
    expect(system).toMatch(/ANTI-DEFAULT/);
    expect(system).toMatch(/tofu/i);
  });

  test('plan user payload threads dietary_pattern through', () => {
    const ctx = {
      ...cuttingDayCtx,
      profile: { ...cuttingDayCtx.profile, dietary_pattern: 'vegetarian' as const },
    };
    const { user } = buildPlanPrompt(ctx);
    expect(user).toContain('"dietary_pattern":"vegetarian"');
  });

  test('detail user payload threads dietary_pattern through', () => {
    const ctx = {
      ...cuttingDayCtx,
      profile: { ...cuttingDayCtx.profile, dietary_pattern: 'vegan' as const },
    };
    const concept = {
      title: 'Test concept',
      oneLineWhy: 'Test why',
      cuisine: 'thai',
      estMinutes: 25,
      pantryFit: 0.7,
    };
    const { user } = buildDetailPrompt(concept, ctx);
    expect(user).toContain('"dietary_pattern":"vegan"');
  });

  test('plan user payload omits dietary_pattern as null when not set', () => {
    const ctx = {
      ...cuttingDayCtx,
      profile: { ...cuttingDayCtx.profile, dietary_pattern: null },
    };
    const { user } = buildPlanPrompt(ctx);
    expect(user).toContain('"dietary_pattern":null');
  });

  test('system prompt names protein anchors to rotate, not just tofu', () => {
    const { system } = buildPlanPrompt(cuttingDayCtx);
    for (const anchor of ['tempeh', 'seitan', 'paneer', 'lentils', 'chickpeas']) {
      expect(system.toLowerCase()).toContain(anchor);
    }
  });
});
