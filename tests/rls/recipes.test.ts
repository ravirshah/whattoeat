import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const aEmail = `rls-ra-${Date.now()}@example.test`;
const bEmail = `rls-rb-${Date.now()}@example.test`;
let aId: string;
let bId: string;
let aPwd: string;

describe('RLS: recipes', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(aEmail);
    const b = await createUserWithPassword(bEmail);
    aId = a.user.id;
    bId = b.user.id;
    aPwd = a.password;

    const minimalRecipe = {
      title: 'Test',
      ingredients: [{ name: 'rice', qty: 1, unit: 'cup', note: null }],
      steps: [{ idx: 1, text: 'cook' }],
      macros: { kcal: 200, protein_g: 5, carbs_g: 40, fat_g: 1 },
      servings: 1,
      total_minutes: 20,
      cuisine: null,
      source: 'user-saved',
      saved: true,
    };

    await admin.from('recipes').insert({ user_id: aId, ...minimalRecipe });
    await admin.from('recipes').insert({ user_id: bId, ...minimalRecipe });
  });
  afterAll(async () => {
    await admin.auth.admin.deleteUser(aId);
    await admin.auth.admin.deleteUser(bId);
  });

  test('A cannot read B recipes', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('recipes').select('*').eq('user_id', bId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
