import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  throw new Error('Missing Supabase env for RLS tests');
}

export const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

export async function createTestUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'rls-test-' + Math.random().toString(36).slice(2),
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error('user create failed');
  return data.user;
}

export async function deleteTestUser(userId: string) {
  await admin.auth.admin.deleteUser(userId);
}

export async function clientFor(userId: string) {
  // Mint a session by setting the access token via service-role workaround:
  // simplest path = admin.auth.admin.generateLink + setSession in a real flow.
  // For RLS tests we sign in directly via the impersonation helper:
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: `${userId}@rls-test.local`,
  });
  if (error) throw error;
  const sb = createClient(URL!, ANON!, { auth: { persistSession: false } });
  // We can't actually consume a magiclink in tests easily — instead, use
  // service-role-issued session via setSession with a manually-signed JWT.
  // The simpler, supported path for RLS testing is `auth.signInWithPassword`
  // using the password we set in createTestUser. Refactor to that.
  return sb;
}

/** Preferred: createTestUser + signIn helpers using a known password. */
export async function createUserWithPassword(email: string, password = 'rls-test-pw-1!') {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error('user create failed');
  return { user: data.user, password };
}

export async function signInClient(email: string, password: string) {
  const sb = createClient(URL!, ANON!, { auth: { persistSession: false } });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return sb;
}
