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

  test('drops candidate with allergen hidden in ingredient.note', async () => {
    // The model could put 'peanut' in the note rather than the name to bypass
    // a name-only filter. The expanded filter must catch this.
    const sneakyDetail = (title: string) => ({
      title,
      oneLineWhy: 'Allergen hidden in note.',
      ingredients: [
        { name: 'rice noodles', qty: 100, unit: 'g', note: 'toss with peanut sauce' },
        { name: 'chicken breast', qty: 150, unit: 'g', note: null },
      ],
      steps: [{ idx: 1, text: 'Cook.', durationMin: 10 }],
      estMacros: { kcal: 500, protein_g: 35, carbs_g: 60, fat_g: 12 },
      servings: 1,
      totalMinutes: 15,
      cuisine: 'thai',
      tags: ['high-protein'],
      pantryCoverage: 0.7,
      missingItems: [],
    });
    const llm = new FakeLlmClient({ detail: sneakyDetail });
    const result = await recommend(allergyCtx, { llm });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.name).toBe('EngineNoCandidatesError');
  });

  test('drops candidate via cross-contamination map (peanut → satay)', async () => {
    // A model that obeys the name-only filter could still output "satay sauce"
    // for a peanut-allergic user. The cross-contamination map must catch it.
    const crossContamDetail = (title: string) => ({
      title,
      oneLineWhy: 'Cross-contamination test.',
      ingredients: [
        { name: 'chicken breast', qty: 150, unit: 'g', note: null },
        { name: 'satay sauce', qty: 30, unit: 'ml', note: null },
      ],
      steps: [{ idx: 1, text: 'Grill.', durationMin: 10 }],
      estMacros: { kcal: 450, protein_g: 35, carbs_g: 20, fat_g: 18 },
      servings: 1,
      totalMinutes: 15,
      cuisine: 'thai',
      tags: ['high-protein'],
      pantryCoverage: 0.5,
      missingItems: ['satay sauce'],
    });
    const llm = new FakeLlmClient({ detail: crossContamDetail });
    const result = await recommend(allergyCtx, { llm });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.name).toBe('EngineNoCandidatesError');
  });
});
