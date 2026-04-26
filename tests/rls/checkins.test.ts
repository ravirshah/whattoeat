import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const aEmail = `rls-ca-${Date.now()}@example.test`;
const bEmail = `rls-cb-${Date.now()}@example.test`;
let aId: string; let bId: string; let aPwd: string;

describe('RLS: checkins', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(aEmail);
    const b = await createUserWithPassword(bEmail);
    aId = a.user.id; bId = b.user.id; aPwd = a.password;

    const today = new Date().toISOString().slice(0, 10);
    await admin.from('checkins').insert({ user_id: aId, date: today, energy: 4, training: 'light', hunger: 'normal' });
    await admin.from('checkins').insert({ user_id: bId, date: today, energy: 2, training: 'hard', hunger: 'high' });
  });
  afterAll(async () => {
    await admin.auth.admin.deleteUser(aId);
    await admin.auth.admin.deleteUser(bId);
  });

  test('A cannot read B checkins', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('checkins').select('*').eq('user_id', bId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
