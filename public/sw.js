"use strict";
(() => {
  // src/app/sw.ts
  importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js");
  if (!self.workbox) {
    console.error("[SW] Workbox failed to load \u2014 PWA offline support will not function.");
  }
  self.workbox.precaching.precacheAndRoute([{"revision":"a2760511c65806022ad20adf74370ff3","url":"window.svg"},{"revision":"2aaafa6a49b6563925fe440891e32717","url":"globe.svg"},{"revision":"ec6d3c7db59cb53417fa3dec70f41c9d","url":"manifest.webmanifest"},{"revision":"8e061864f388b47f33a1c3780831193e","url":"next.svg"},{"revision":"c0af2f507b369b085b35ef4bbe3bcf1e","url":"vercel.svg"},{"revision":"d09f95206c3fa0bb9bd9fefabfd0ea71","url":"file.svg"},{"revision":"d8f76af0168225972b1c86d212101840","url":"icons/icon-512.png"},{"revision":"0a7c2ff77d47bb4827c854de5f3042f4","url":"icons/icon-maskable-512.png"},{"revision":"8bca2f093ae5f7cc7f390ed06291ac58","url":"icons/icon.svg"},{"revision":"62f1bbb18785e01a3cbd65ec99760665","url":"icons/icon-maskable-192.png"},{"revision":"2cf00d7d513ae473adbaf2b7603dce46","url":"icons/icon-192.png"},{"revision":null,"url":"/_next/static/chunks/webpack-50cb68b5cb41e38c.js"},{"revision":null,"url":"/_next/static/chunks/52774a7f-e4408228fa62388d.js"},{"revision":null,"url":"/_next/static/chunks/4bd1b696-fb1daa649bfba8e1.js"},{"revision":null,"url":"/_next/static/chunks/117-4045415286a53808.js"},{"revision":null,"url":"/_next/static/chunks/main-app-b0ecd373c3eec82b.js"},{"revision":null,"url":"/_next/static/chunks/app/_not-found/page-c930e9e3bf011adc.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/callback/route-e34b67596635061b.js"},{"revision":null,"url":"/_next/static/chunks/app/global-error-77003c87947a4cc2.js"},{"revision":null,"url":"/_next/static/css/0207cf244351ad80.css"},{"revision":null,"url":"/_next/static/chunks/720-ad4d9d08495d65b6.js"},{"revision":null,"url":"/_next/static/chunks/app/layout-c143885318894ef7.js"},{"revision":null,"url":"/_next/static/chunks/app/error-a79896f077ebb18a.js"},{"revision":null,"url":"/_next/static/chunks/909-c72ae46c1dc7c36e.js"},{"revision":null,"url":"/_next/static/chunks/812-bf8407dd881eb19c.js"},{"revision":null,"url":"/_next/static/chunks/app/(dev)/preview/page-5303850f96573a3c.js"},{"revision":null,"url":"/_next/static/chunks/app/page-0482cce108931d85.js"},{"revision":null,"url":"/_next/static/chunks/app/recipes/[id]/page-c25b758dc7c06253.js"},{"revision":null,"url":"/_next/static/chunks/app/checkin/page-96da230dfd940693.js"},{"revision":null,"url":"/_next/static/chunks/44530001-43bd91145eef5af2.js"},{"revision":null,"url":"/_next/static/chunks/297-26f69d0ceab59ef3.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/login/page-756ef28670a6874c.js"},{"revision":null,"url":"/_next/static/chunks/619-89f5d51eee0ff2f3.js"},{"revision":null,"url":"/_next/static/chunks/app/feed-me/error-535f1a63cc5ae78a.js"},{"revision":null,"url":"/_next/static/chunks/app/feed-me/loading-f511eb845c1dff91.js"},{"revision":null,"url":"/_next/static/chunks/120-27710a688832e114.js"},{"revision":null,"url":"/_next/static/chunks/app/feed-me/page-3b45917c68019061.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/error/page-4ea758aae7b2548b.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/signup/page-fc0b3946620c3156.js"},{"revision":null,"url":"/_next/static/chunks/app/offline/loading-ef3756b1842cb180.js"},{"revision":null,"url":"/_next/static/chunks/app/offline/page-fa6337b528a6d192.js"},{"revision":null,"url":"/_next/static/chunks/app/profile/page-4ed9838823597d05.js"},{"revision":null,"url":"/_next/static/chunks/app/pantry/error-0f22d41c230e27bf.js"},{"revision":null,"url":"/_next/static/chunks/app/pantry/loading-d97aa87293346557.js"},{"revision":null,"url":"/_next/static/chunks/app/pantry/page-47c95d224d2daf2a.js"},{"revision":null,"url":"/_next/static/chunks/app/profile/edit/page-eb7f18daca68eec3.js"},{"revision":null,"url":"/_next/static/chunks/app/recipes/cooked/page-0c1c452fb0a43f09.js"},{"revision":null,"url":"/_next/static/chunks/app/recipes/saved/page-aed61ad8165a9c17.js"},{"revision":null,"url":"/_next/static/chunks/framework-9e505ecbf29946d5.js"},{"revision":null,"url":"/_next/static/chunks/main-b34ce996b79bd151.js"},{"revision":null,"url":"/_next/static/chunks/pages/_app-63b1c87ca04d8961.js"},{"revision":null,"url":"/_next/static/chunks/pages/_error-22e96bcb51cff931.js"}] ?? []);
  self.workbox.precaching.precacheAndRoute([{ url: "/offline", revision: "2" }]);
  self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
      self.skipWaiting();
    }
  });
  self.workbox.core.clientsClaim();
  self.workbox.routing.registerRoute(
    ({ request }) => request.method === "POST",
    new self.workbox.strategies.NetworkOnly()
  );
  self.workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith("/api/"),
    new self.workbox.strategies.NetworkOnly()
  );
  self.workbox.routing.registerRoute(
    ({ url, request }) => request.mode === "navigate" && url.pathname.startsWith("/pantry"),
    new self.workbox.strategies.StaleWhileRevalidate({
      cacheName: "pantry-html-cache",
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 5,
          maxAgeSeconds: 7 * 24 * 60 * 60
        })
      ]
    })
  );
  var networkFirstHandler = new self.workbox.strategies.NetworkFirst({
    cacheName: "html-navigation-cache",
    networkTimeoutSeconds: 7,
    plugins: [
      new self.workbox.expiration.ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 24 * 60 * 60
      })
    ]
  });
  self.workbox.routing.registerRoute(
    ({ request }) => request.mode === "navigate",
    async (context) => {
      try {
        return await networkFirstHandler.handle(context);
      } catch {
        const cache = await caches.open("workbox-precache-v2");
        const offlineFallback = await cache.match("/offline");
        if (offlineFallback)
          return offlineFallback;
        return new Response(
          "<html><body><p>You are offline. Please reconnect and try again.</p></body></html>",
          { headers: { "Content-Type": "text/html" } }
        );
      }
    }
  );
  self.workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith("/_next/static/"),
    new self.workbox.strategies.StaleWhileRevalidate({
      cacheName: "next-static-cache"
    })
  );
  self.workbox.routing.registerRoute(
    ({ request }) => request.destination === "image",
    new self.workbox.strategies.StaleWhileRevalidate({
      cacheName: "image-cache",
      plugins: [
        new self.workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60
        })
      ]
    })
  );
})();
