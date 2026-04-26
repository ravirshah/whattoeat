'use client';

/**
 * App Router global (top-level) error boundary.
 * Fires when an error escapes the root layout — the nuclear fallback.
 * Must include <html> and <body> because the layout is gone.
 *
 * Reports to Sentry tagged boundary:'global'.
 *
 * Styling: rgb() values to stay compatible with the project no-raw-hex guard.
 * Dark palette is hard-coded because the root layout (and CSS vars) are gone.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag('boundary', 'global');
      if (error.digest) scope.setExtra('digest', error.digest);
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: 'rgb(15 15 15)',
          color: 'rgb(237 237 237)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          boxSizing: 'border-box',
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: 480,
            width: '100%',
            background: 'rgb(26 26 26)',
            border: '1px solid rgb(51 51 51)',
            borderRadius: 16,
            padding: '2.5rem 2rem',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '2.5rem', margin: '0 0 0.75rem' }} aria-hidden>
            🔥
          </p>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: '0 0 0.75rem',
            }}
          >
            Something broke badly
          </h1>
          <p
            style={{
              color: 'rgb(153 153 153)',
              margin: '0 0 2rem',
              lineHeight: 1.6,
            }}
          >
            The kitchen is temporarily on fire. We&apos;ve been notified and are on it. Your data is
            safe — this is a display error.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: '0.6rem 1.5rem',
                background: 'rgb(16 185 129)',
                color: 'rgb(255 255 255)',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: '0.6rem 1.5rem',
                background: 'transparent',
                color: 'rgb(237 237 237)',
                border: '1px solid rgb(68 68 68)',
                borderRadius: 8,
                fontWeight: 500,
                fontSize: '0.95rem',
                textDecoration: 'none',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
