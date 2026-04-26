// src/app/auth/dev/route.ts
// Dev-only instant sign-in that bypasses email magic-link round-trip.
// Hard 404s outside development to keep the prod surface clean.

import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

const DEV_FALLBACK_EMAIL = 'dev@whattoeat.local';
const DEV_PASSWORD = 'dev-password-do-not-use-in-prod';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get('email')?.trim() || DEV_FALLBACK_EMAIL;
  const next = url.searchParams.get('next') || '/home';

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing in .env.local' },
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Ensure the dev user exists with a known password so we can sign in directly.
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users.find((u) => u.email === email);
  if (!found) {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: DEV_PASSWORD,
    });
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
  } else if (!found.email_confirmed_at) {
    // Existing but unconfirmed — confirm + reset password to known dev password.
    await admin.auth.admin.updateUserById(found.id, {
      email_confirm: true,
      password: DEV_PASSWORD,
    });
  } else {
    // Confirmed user — reset password so we can sign in (in case it was changed).
    await admin.auth.admin.updateUserById(found.id, { password: DEV_PASSWORD });
  }

  // Sign in via password through the SSR client so cookies are written to the response.
  const supabase = await createServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_PASSWORD,
  });

  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 500 });
  }

  const isSafeRelative = next.startsWith('/') && !next.startsWith('//');
  const destination = isSafeRelative ? next : '/home';
  return NextResponse.redirect(new URL(destination, url.origin));
}
