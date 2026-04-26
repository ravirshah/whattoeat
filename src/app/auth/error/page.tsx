import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Auth error — WhatToEat',
};

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function AuthErrorPage({ searchParams }: Props) {
  const { reason } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t sign you in. This link may have expired or already been used.
          </p>
          {reason && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {reason}
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
