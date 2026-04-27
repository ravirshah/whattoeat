import type { MealCandidate } from '@/contracts/zod/recommendation';
import { buildModifyPrompt } from '@/engine/prompt';
import { describe, expect, it } from 'vitest';

const ORIGINAL: MealCandidate = {
  title: 'Grilled Chicken & Rice',
  oneLineWhy: 'High protein for your cut.',
  ingredients: [
    { name: 'chicken breast', qty: 200, unit: 'g', note: null },
    { name: 'white rice', qty: 150, unit: 'g', note: null },
  ],
  steps: [
    { idx: 1, text: 'Season chicken.', durationMin: 2 },
    { idx: 2, text: 'Grill.', durationMin: 15 },
  ],
  estMacros: { kcal: 500, protein_g: 45, carbs_g: 50, fat_g: 10 },
  servings: 1,
  totalMinutes: 25,
  cuisine: 'american',
  tags: ['high-protein'],
  pantryCoverage: 0.9,
  missingItems: [],
};

const PROFILE_CTX = {
  profile: {
    user_id: '00000000-0000-0000-0000-000000000001',
    display_name: 'Test',
    goal: 'cut' as const,
    targets: { kcal: 1600, protein_g: 150, carbs_g: 130, fat_g: 50 },
    height_cm: 175,
    weight_kg: 75,
    birthdate: '1990-01-01',
    sex: 'male' as const,
    activity_level: 'moderate' as const,
    dietary_pattern: null,
    allergies: ['peanut', 'shellfish'],
    dislikes: [] as string[],
    cuisines: [] as string[],
    equipment: ['stovetop'],
    created_at: '2026-04-26T00:00:00.000Z',
    updated_at: '2026-04-26T00:00:00.000Z',
  },
};

describe('buildModifyPrompt', () => {
  it('system prompt contains allergy reminder', () => {
    const { system } = buildModifyPrompt(ORIGINAL, 'Make it faster', [], PROFILE_CTX);
    expect(system).toContain('peanut');
    expect(system).toContain('shellfish');
    expect(system).toContain('ALLERGY HARD CONSTRAINT');
  });

  it('user payload contains the instruction', () => {
    const { user } = buildModifyPrompt(ORIGINAL, 'Make it vegetarian', [], PROFILE_CTX);
    const parsed = JSON.parse(user) as { instruction: string };
    expect(parsed.instruction).toBe('Make it vegetarian');
  });

  it('user payload includes prior tweaks', () => {
    const priors = ['Faster', 'More protein'];
    const { user } = buildModifyPrompt(ORIGINAL, 'Make it spicy', priors, PROFILE_CTX);
    const parsed = JSON.parse(user) as { prior_tweaks: string[] };
    expect(parsed.prior_tweaks).toEqual(priors);
  });

  it('user payload includes original recipe', () => {
    const { user } = buildModifyPrompt(ORIGINAL, 'Different cuisine', [], PROFILE_CTX);
    const parsed = JSON.parse(user) as { original_recipe: { title: string } };
    expect(parsed.original_recipe.title).toBe(ORIGINAL.title);
  });

  it('system instructs to preserve unchanged parts', () => {
    const { system } = buildModifyPrompt(ORIGINAL, 'Faster', [], PROFILE_CTX);
    expect(system).toMatch(/preserve/i);
  });

  it('returns empty prior_tweaks array when none passed', () => {
    const { user } = buildModifyPrompt(ORIGINAL, 'Faster', [], PROFILE_CTX);
    const parsed = JSON.parse(user) as { prior_tweaks: string[] };
    expect(parsed.prior_tweaks).toEqual([]);
  });
});
