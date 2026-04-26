import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // Expose non-secret version constants to the client bundle.
    NEXT_PUBLIC_ENGINE_VERSION: process.env.npm_package_version ?? '2.0.0',
    // NEXT_PUBLIC_PROMPTS_VERSION is injected by CI once Track 2 is merged.
    NEXT_PUBLIC_PROMPTS_VERSION: process.env.NEXT_PUBLIC_PROMPTS_VERSION ?? 'unset',
  },
};

export default withSentryConfig(nextConfig, {
  // Source-map upload — only runs when SENTRY_AUTH_TOKEN is set (CI env).
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Disable source-map upload in local dev (token absent → upload skipped
  // automatically, but being explicit avoids the "missing auth token" warning).
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Auto-instrument Server Components, Route Handlers, Server Actions.
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,

  // Suppress the "sentry.server.config.ts will be bundled" log in dev.
  hideSourceMaps: false,
});
