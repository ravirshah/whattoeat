import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const baseConfig: NextConfig = {
  env: {
    // Expose non-secret version constants to the client bundle.
    NEXT_PUBLIC_ENGINE_VERSION: process.env.npm_package_version ?? '2.0.0',
    // NEXT_PUBLIC_PROMPTS_VERSION is injected by CI once Track 2 is merged.
    NEXT_PUBLIC_PROMPTS_VERSION: process.env.NEXT_PUBLIC_PROMPTS_VERSION ?? 'unset',
  },

  async headers() {
    return [
      {
        // Service worker must not be cached by the browser — always fetched fresh
        // so the browser detects new SW versions on every navigation.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        // The manifest must be served with the correct MIME type for Lighthouse.
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ];
  },
};

export default withSentryConfig(baseConfig, {
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
