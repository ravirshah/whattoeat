'use client';

/**
 * App Router per-segment error boundary.
 * Catches rendering and data-fetching errors in child route segments.
 * The root layout is preserved — the nav and shell stay visible.
 *
 * Design: Track 1 Card + Button. Falls back to plain elements if ui/ not merged.
 * <!-- TODO: swap stubs below for Card/Button once Track 1 is on main -->
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Report to Sentry with the route-level boundary tag so we can distinguish
    // from global-error catches in the Sentry dashboard.
    Sentry.withScope((scope) => {
      scope.setTag('boundary', 'segment');
      if (error.digest) scope.setExtra('digest', error.digest);
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        gap: '1.25rem',
        textAlign: 'center',
      }}
    >
      {/* TODO: replace outer div + inner divs with <Card> from @/components/ui/card */}
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '2rem',
          background: 'var(--surface-elevated)',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        <p
          style={{
            fontSize: '2rem',
            marginBottom: '0.5rem',
          }}
          aria-hidden
        >
          🍳
        </p>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: 'var(--text)',
          }}
        >
          Something went sideways in the kitchen
        </h2>
        <p
          style={{
            color: 'var(--text-muted)',
            marginBottom: '1.5rem',
            fontSize: '0.95rem',
          }}
        >
          Don&apos;t worry — your pantry and saved recipes are safe. This page hit an unexpected
          error.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          {/* TODO: replace with <Button variant="default"> from @/components/ui/button */}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--r-md)',
              background: 'var(--accent)',
              color: 'var(--accent-fg)',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {/* TODO: replace with <Button variant="outline"> */}
          <a
            href="/"
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--r-md)',
              background: 'transparent',
              color: 'var(--text)',
              fontWeight: 500,
              border: '1px solid var(--border)',
              textDecoration: 'none',
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
