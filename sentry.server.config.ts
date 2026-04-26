import * as Sentry from '@sentry/nextjs';

const ENABLED = process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLE_DEV === '1';

const dsn = process.env.SENTRY_DSN;
if (!dsn) {
  console.warn('[sentry] DSN not set, skipping server init');
} else {
  Sentry.init({
    dsn,
    enabled: ENABLED,
    tracesSampleRate: 0.5,
    // Node profiling for server-side perf (optional; remove if overhead shows up).
    profilesSampleRate: 0.1,
  });
}
