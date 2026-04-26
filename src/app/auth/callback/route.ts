import { createServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;

  if (!code) {
    return NextResponse.redirect(new URL('/auth/error?reason=missing_code', appUrl));
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL('/auth/error', appUrl);
    url.searchParams.set('reason', error.message);
    return NextResponse.redirect(url);
  }

  // Redirect to the originally requested page or home.
  const destination = next.startsWith('/') ? next : '/';
  return NextResponse.redirect(new URL(destination, appUrl));
}
