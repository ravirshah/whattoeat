#!/usr/bin/env bun
// Set or reset a user's password via Supabase admin API.
//
// Usage:
//   bun scripts/set-password.ts <email> <password>
//
// Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (read from .env.local).
// Creates the user if missing, otherwise updates their password and confirms
// the email. Useful when Supabase's built-in SMTP rate-limits magic-link
// emails and you need a non-email auth path.

import { createClient } from '@supabase/supabase-js';

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error('Usage: bun scripts/set-password.ts <email> <password>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listError } = await admin.auth.admin.listUsers();
if (listError) {
  console.error('Failed to list users:', listError.message);
  process.exit(1);
}

const found = list.users.find((u) => u.email === email);
if (!found) {
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error('createUser failed:', error.message);
    process.exit(1);
  }
  console.log(`Created ${email} with password set.`);
  process.exit(0);
}

const { error } = await admin.auth.admin.updateUserById(found.id, {
  password,
  email_confirm: true,
});
if (error) {
  console.error('updateUserById failed:', error.message);
  process.exit(1);
}
console.log(`Updated password for ${email}.`);
