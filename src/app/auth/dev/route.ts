// src/app/auth/dev/route.ts
// Dev-only instant sign-in that bypasses email magic-link round-trip.
// Hard 404s outside development to keep the prod surface clean.

import { type CookieOptions, createServerClient } from '@supabase/ssr';
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
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!serviceKey || !supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Supabase env vars missing in .env.local' }, { status: 500 });
  }

  // Step 1 — admin: ensure dev user exists with a known password.
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
  } else {
    await admin.auth.admin.updateUserById(found.id, {
      email_confirm: true,
      password: DEV_PASSWORD,
    });
  }

  // Step 2 — sign in via password through an SSR client whose cookies attach
  // to the redirect response (canonical Supabase SSR pattern for route handlers).
  const isSafeRelative = next.startsWith('/') && !next.startsWith('//');
  const destination = isSafeRelative ? next : '/home';
  const response = NextResponse.redirect(new URL(destination, url.origin));

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_PASSWORD,
  });

  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 500 });
  }

  return response;
}
