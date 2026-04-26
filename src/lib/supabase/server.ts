import 'server-only';
import { createServerClient as _createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from a Server Component — cookie writes
            // are safe only from middleware or Route Handlers, so we
            // swallow the error here. The middleware keeps sessions fresh.
          }
        },
      },
    },
  );
}
