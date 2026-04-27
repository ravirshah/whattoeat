import { getSiteUrl } from '@/lib/site-url';
import { createServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const appUrl = getSiteUrl();

  if (!code) {
    return NextResponse.redirect(new URL('/auth/error?reason=missing_code', appUrl));
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL('/auth/error', appUrl);
    url.searchParams.set('reason', 'exchange_failed');
    return NextResponse.redirect(url);
  }

  // Only allow same-origin relative paths. Reject protocol-relative URLs
  // (e.g. "//evil.com") which would otherwise redirect off-site.
  const isSafeRelative = next.startsWith('/') && !next.startsWith('//');
  const destination = isSafeRelative ? next : '/';
  return NextResponse.redirect(new URL(destination, appUrl));
}
