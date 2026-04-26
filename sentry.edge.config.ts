import * as Sentry from '@sentry/nextjs';

const ENABLED = process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLE_DEV === '1';

const dsn = process.env.SENTRY_DSN;
if (!dsn) {
  console.warn('[sentry] DSN not set, skipping edge init');
} else {
  Sentry.init({
    dsn,
    enabled: ENABLED,
    tracesSampleRate: 0.5,
  });
}
