import * as Sentry from '@sentry/nextjs';

const ENABLED = process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLE_DEV === '1';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: ENABLED,
  tracesSampleRate: 0.2,
  // Replay only on user-facing errors; keep PII out.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Source maps are uploaded from CI; local builds omit them.
  // SENTRY_AUTH_TOKEN must be present in the CI environment.
});
