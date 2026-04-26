import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const aEmail = `rls-ssa-${Date.now()}@example.test`;
let aId: string;
let aPwd: string;

describe('RLS: signal_snapshots', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(aEmail);
    aId = a.user.id;
    aPwd = a.password;
    await admin.from('signal_snapshots').insert({
      user_id: aId,
      source: 'apple_health',
      kind: 'sleep',
      payload: { hours: 7 },
      observed_at: new Date().toISOString(),
    });
  });
  afterAll(async () => {
    await admin.auth.admin.deleteUser(aId);
  });

  test('user can read own snapshots', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('signal_snapshots').select('*').eq('user_id', aId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  test('user CANNOT insert snapshots from client', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { error } = await sb.from('signal_snapshots').insert({
      user_id: aId,
      source: 'apple_health',
      kind: 'sleep',
      payload: {},
      observed_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });
});
