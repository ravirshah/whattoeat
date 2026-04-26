'use client';

import { EmptyState } from '@/components/feature/feed-me/EmptyState';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface FeedMeErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * App Router error boundary for the /feed-me route segment.
 * Captures to Sentry, then renders a graceful recovery UI.
 * The error boundary only fires for uncaught RSC errors — the island
 * handles its own action errors via the state machine in FeedMeIsland.
 */
export default function FeedMeError({ error, reset }: FeedMeErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { route: '/feed-me', errorDigest: error.digest ?? 'none' },
    });
  }, [error]);

  return (
    <main className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">Feed Me</h1>
      </div>
      <div className="py-6">
        <EmptyState variant="data-fetch-failed" onRetry={reset} />
      </div>
    </main>
  );
}
