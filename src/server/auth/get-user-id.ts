import 'server-only';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Returns the authenticated user's UUID, or null if the request is
 * unauthenticated. Uses getUser() (server-verified), not getSession().
 */
export async function getUserId(): Promise<string | null> {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
