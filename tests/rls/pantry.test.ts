import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const aEmail = `rls-pa-${Date.now()}@example.test`;
const bEmail = `rls-pb-${Date.now()}@example.test`;
let aId: string;
let bId: string;
let aPwd: string;

describe('RLS: pantry_items', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(aEmail);
    const b = await createUserWithPassword(bEmail);
    aId = a.user.id;
    bId = b.user.id;
    aPwd = a.password;

    await admin
      .from('pantry_items')
      .insert({ user_id: aId, name: 'rice', display_name: 'Rice', category: 'grain' });
    await admin
      .from('pantry_items')
      .insert({ user_id: bId, name: 'chicken', display_name: 'Chicken', category: 'protein' });
  });
  afterAll(async () => {
    await admin.auth.admin.deleteUser(aId);
    await admin.auth.admin.deleteUser(bId);
  });

  test('A cannot read B items', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('pantry_items').select('*').eq('user_id', bId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('A can read own items', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('pantry_items').select('*').eq('user_id', aId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  test('A cannot delete B items', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('pantry_items').delete().eq('user_id', bId).select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
