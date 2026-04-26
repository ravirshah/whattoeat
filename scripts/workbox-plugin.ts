/**
 * scripts/workbox-plugin.ts
 *
 * Next.js config wrapper that adds the required HTTP headers for the
 * service worker and web app manifest.
 *
 * The actual Workbox injectManifest step runs as a postbuild script
 * (scripts/postbuild-pwa.ts) invoked by the `build` npm script.
 */

import type { NextConfig } from 'next';

export function withPWA(nextConfig: NextConfig): NextConfig {
  const existingHeaders = nextConfig.headers;

  return {
    ...nextConfig,
    async headers() {
      // Start with any headers from the base config.
      const base = existingHeaders ? await existingHeaders() : [];

      return [
        ...base,
        {
          // Service worker must not be cached — always fetched fresh so the
          // browser detects new SW versions on every navigation.
          source: '/sw.js',
          headers: [
            { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
            { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
            { key: 'Service-Worker-Allowed', value: '/' },
          ],
        },
        {
          // Manifest must be served with the correct MIME type for Lighthouse.
          source: '/manifest.webmanifest',
          headers: [
            { key: 'Content-Type', value: 'application/manifest+json' },
            { key: 'Cache-Control', value: 'public, max-age=86400' },
          ],
        },
      ];
    },
  };
}
