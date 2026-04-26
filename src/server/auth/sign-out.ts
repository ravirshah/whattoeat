'use server';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Server Action — signs the current user out, clears the session cookie,
 * revalidates the root layout cache, then redirects to /auth/login.
 */
export async function signOut(): Promise<never> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/auth/login');
}
