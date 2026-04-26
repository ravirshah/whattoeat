import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Auth error — WhatToEat',
};

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

// Allowlist of reason codes set by /auth/callback.  Rendering an arbitrary
// `?reason=` from the URL would let an attacker socially engineer users via
// an authentic-looking page; only known codes get a canned message.
const REASON_MESSAGES: Record<string, string> = {
  missing_code: 'The sign-in link is missing a required code.',
  exchange_failed: 'The sign-in link has expired or has already been used.',
};

export default async function AuthErrorPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const detail = reason ? REASON_MESSAGES[reason] : undefined;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t sign you in. This link may have expired or already been used.
          </p>
          {detail && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {detail}
            </p>
          )}
        </div>
        <Link
          href="/auth/login"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
