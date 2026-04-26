import * as Sentry from '@sentry/nextjs';

const ENABLED = process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLE_DEV === '1';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: ENABLED,
  tracesSampleRate: 0.5,
});
