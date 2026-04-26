import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, createUserWithPassword, signInClient } from './_helpers';

const aEmail = `rls-rra-${Date.now()}@example.test`;
let aId: string; let aPwd: string;

describe('RLS: recommendation_runs', () => {
  beforeAll(async () => {
    const a = await createUserWithPassword(aEmail);
    aId = a.user.id; aPwd = a.password;
    await admin.from('recommendation_runs').insert({
      user_id: aId,
      context_snapshot: {},
      candidates: [],
      model: 'gemini-test',
      prompts_version: '0',
      prompt_tokens: 0,
      completion_tokens: 0,
      latency_ms: 1,
    });
  });
  afterAll(async () => { await admin.auth.admin.deleteUser(aId); });

  test('user can read own runs', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { data, error } = await sb.from('recommendation_runs').select('*').eq('user_id', aId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  test('user CANNOT insert runs from client', async () => {
    const sb = await signInClient(aEmail, aPwd);
    const { error } = await sb.from('recommendation_runs').insert({
      user_id: aId,
      context_snapshot: {},
      candidates: [],
      model: 'x',
      prompts_version: '0',
      prompt_tokens: 0,
      completion_tokens: 0,
      latency_ms: 1,
    });
    // No INSERT policy = denied
    expect(error).not.toBeNull();
  });
});
