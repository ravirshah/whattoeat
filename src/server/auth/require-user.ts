import 'server-only';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type AuthUser = {
  userId: string;
  email: string;
};

/**
 * Returns the authenticated user's id and email.
 * Calls redirect('/auth/login') if the request is unauthenticated —
 * Next.js will throw internally, unwinding the call stack cleanly.
 *
 * Uses getUser() (server-verified), never getSession().
 */
export async function requireUser(): Promise<AuthUser> {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect('/auth/login');
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? '',
  };
}
