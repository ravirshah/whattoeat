// WhatToEat service worker — hand-rolled, no Workbox.
//
// Strategy:
//   • Static (/_next/static/**, fonts, icons): cache-first, long TTL.
//   • HTML navigations: network-first, fall back to cached shell, then /offline.
//   • Auth, server actions, /api/*: network-only (NEVER cache).
//   • Manifest, sw.js itself: never cached here (HTTP headers handle that).

const VERSION = 'v1';
const STATIC_CACHE = `wte-static-${VERSION}`;
const HTML_CACHE = `wte-html-${VERSION}`;
const OFFLINE_URL = '/offline';
const PRECACHE = ['/', OFFLINE_URL, '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {}),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== STATIC_CACHE && k !== HTML_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isNetworkOnly(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/_next/data/')
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(woff2?|ttf|otf|png|jpg|jpeg|webp|svg|ico)$/i.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isNetworkOnly(url)) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(HTML_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match(OFFLINE_URL))),
    );
  }
});
