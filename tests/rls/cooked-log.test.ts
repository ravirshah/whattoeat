import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const aEmail = `rls-cla-${Date.now()}@example.test`;
const bEmail = `rls-clb-${Date.now()}@example.test`;
let aId: string;
let bId: string;
let aPwd: string;

describe('RLS: cooked_log', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(aEmail);
    const b = await createUserWithPassword(bEmail);
    aId = a.user.id;
    bId = b.user.id;
    aPwd = a.password;

    const minimalRecipe = {
      title: 'X',
      ingredients: [{ name: 'x', qty: 1, unit: null, note: null }],
      steps: [{ idx: 1, text: 'x' }],
      macros: { kcal: 100, protein_g: 1, carbs_g: 1, fat_g: 1 },
      servings: 1,
      total_minutes: 1,
      cuisine: null,
      source: 'user-saved',
      saved: false,
    };
    const { data: ra, error: raErr } = await admin
      .from('recipes')
      .insert({ user_id: aId, ...minimalRecipe })
      .select()
      .single();
    if (raErr || !ra) throw raErr ?? new Error('insert recipe a failed');
    const { data: rb, error: rbErr } = await admin
      .from('recipes')
      .insert({ user_id: bId, ...minimalRecipe })
      .select()
      .single();
    if (rbErr || !rb) throw rbErr ?? new Error('insert recipe b failed');
    await admin.from('cooked_log').insert({ user_id: aId, recipe_id: ra.id });
    await admin.from('cooked_log').insert({ user_id: bId, recipe_id: rb.id });
  });
  afterAll(async () => {
    await admin.auth.admin.deleteUser(aId);
    await admin.auth.admin.deleteUser(bId);
  });

  test('A cannot read B cooked_log', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('cooked_log').select('*').eq('user_id', bId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
