'use client';

import { useEffect } from 'react';

interface PantryErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PantryError({ error, reset }: PantryErrorProps) {
  useEffect(() => {
    // In production, pipe to Sentry here.
    console.error('[PantryError]', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-xl font-semibold">Something went wrong loading your pantry.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message ?? 'An unexpected error occurred.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
      >
        Try again
      </button>
    </main>
  );
}
