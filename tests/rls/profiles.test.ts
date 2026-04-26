import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const userAEmail = `rls-a-${Date.now()}@example.test`;
const userBEmail = `rls-b-${Date.now()}@example.test`;

let userAId: string;
let userBId: string;
let aPwd: string;
let bPwd: string;

describe('RLS: profiles', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(userAEmail);
    const b = await createUserWithPassword(userBEmail);
    userAId = a.user.id;
    userBId = b.user.id;
    aPwd = a.password;
    bPwd = b.password;

    // Insert profile rows for both via service-role
    await admin.from('profiles').insert({
      user_id: userAId,
      goal: 'maintain',
      target_kcal: 2200,
      target_protein_g: 160,
      target_carbs_g: 220,
      target_fat_g: 70,
    });
    await admin.from('profiles').insert({
      user_id: userBId,
      goal: 'cut',
      target_kcal: 1900,
      target_protein_g: 170,
      target_carbs_g: 170,
      target_fat_g: 60,
    });
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userAId);
    await admin.auth.admin.deleteUser(userBId);
  });

  test('user A can read own profile', async () => {
    const sb = await signInClient(userAEmail, aPwd);
    const { data, error } = await sb.from('profiles').select('*').eq('user_id', userAId).single();
    expect(error).toBeNull();
    expect(data?.user_id).toBe(userAId);
  });

  test('user A cannot read user B profile', async () => {
    const sb = await signInClient(userAEmail, aPwd);
    const { data, error } = await sb.from('profiles').select('*').eq('user_id', userBId);
    // RLS denies → returns empty rows, no error
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('user A cannot update user B profile', async () => {
    const sb = await signInClient(userAEmail, aPwd);
    const { data, error } = await sb
      .from('profiles')
      .update({ goal: 'bulk' })
      .eq('user_id', userBId)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]); // RLS update applies to 0 rows
  });
});
