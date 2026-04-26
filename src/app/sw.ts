/**
 * src/app/sw.ts
 *
 * WhatToEat 2.0 — Service Worker (Workbox injectManifest pattern)
 *
 * This file is compiled by esbuild in scripts/workbox-plugin.ts, then
 * workbox-build injectManifest replaces self.__WB_MANIFEST with the
 * computed precache manifest. Output lands at public/sw.js.
 *
 * DO NOT import this file from any Next.js page or server component.
 * It runs in a ServiceWorkerGlobalScope, not in the browser document.
 *
 * NOTE: This file is intentionally excluded from the main tsconfig.json
 * because it uses ServiceWorkerGlobalScope types that conflict with the
 * browser DOM lib. It is compiled by esbuild directly via workbox-plugin.ts.
 */

/* eslint-disable */
// @ts-nocheck — SW runs outside the browser React tree; types checked by esbuild

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

if (!self.workbox) {
  console.error('[SW] Workbox failed to load — PWA offline support will not function.');
}

// ---------------------------------------------------------------------------
// 1. Precache — static assets injected at build time
// ---------------------------------------------------------------------------

self.workbox.precaching.precacheAndRoute(self.__WB_MANIFEST ?? []);

// Always precache the offline fallback page explicitly.
self.workbox.precaching.precacheAndRoute([{ url: '/offline', revision: '2' }]);

// ---------------------------------------------------------------------------
// 2. Skip waiting on message from client
// ---------------------------------------------------------------------------

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ---------------------------------------------------------------------------
// 3. Claim clients on activate
// ---------------------------------------------------------------------------

self.workbox.core.clientsClaim();

// ---------------------------------------------------------------------------
// 4. NetworkOnly for all POST requests (server actions + mutations)
// ---------------------------------------------------------------------------

self.workbox.routing.registerRoute(
  ({ request }) => request.method === 'POST',
  new self.workbox.strategies.NetworkOnly(),
);

// ---------------------------------------------------------------------------
// 5. NetworkOnly for /api/** routes
// ---------------------------------------------------------------------------

self.workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new self.workbox.strategies.NetworkOnly(),
);

// ---------------------------------------------------------------------------
// 6. StaleWhileRevalidate for the /pantry HTML shell
// ---------------------------------------------------------------------------

self.workbox.routing.registerRoute(
  ({ url, request }) => request.mode === 'navigate' && url.pathname.startsWith('/pantry'),
  new self.workbox.strategies.StaleWhileRevalidate({
    cacheName: 'pantry-html-cache',
    plugins: [
      new self.workbox.expiration.ExpirationPlugin({
        maxEntries: 5,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  }),
);

// ---------------------------------------------------------------------------
// 7. NetworkFirst for all other HTML navigations
// ---------------------------------------------------------------------------

const networkFirstHandler = new self.workbox.strategies.NetworkFirst({
  cacheName: 'html-navigation-cache',
  networkTimeoutSeconds: 7,
  plugins: [
    new self.workbox.expiration.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 24 * 60 * 60,
    }),
  ],
});

self.workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  async (context) => {
    try {
      return await networkFirstHandler.handle(context);
    } catch {
      const cache = await caches.open('workbox-precache-v2');
      const offlineFallback = await cache.match('/offline');
      if (offlineFallback) return offlineFallback;
      return new Response(
        '<html><body><p>You are offline. Please reconnect and try again.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } },
      );
    }
  },
);

// ---------------------------------------------------------------------------
// 8. StaleWhileRevalidate for /_next/static/**
// ---------------------------------------------------------------------------

self.workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith('/_next/static/'),
  new self.workbox.strategies.StaleWhileRevalidate({
    cacheName: 'next-static-cache',
  }),
);

// ---------------------------------------------------------------------------
// 9. StaleWhileRevalidate for images not in precache
// ---------------------------------------------------------------------------

self.workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new self.workbox.strategies.StaleWhileRevalidate({
    cacheName: 'image-cache',
    plugins: [
      new self.workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);
