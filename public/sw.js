"use strict";
(() => {
  // src/app/sw.ts
  importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js");
  if (!self.workbox) {
    console.error("[SW] Workbox failed to load \u2014 PWA offline support will not function.");
  }
  self.workbox.precaching.precacheAndRoute([{"revision":"a2760511c65806022ad20adf74370ff3","url":"window.svg"},{"revision":"2aaafa6a49b6563925fe440891e32717","url":"globe.svg"},{"revision":"ec6d3c7db59cb53417fa3dec70f41c9d","url":"manifest.webmanifest"},{"revision":"8e061864f388b47f33a1c3780831193e","url":"next.svg"},{"revision":"c0af2f507b369b085b35ef4bbe3bcf1e","url":"vercel.svg"},{"revision":"d09f95206c3fa0bb9bd9fefabfd0ea71","url":"file.svg"},{"revision":"d8f76af0168225972b1c86d212101840","url":"icons/icon-512.png"},{"revision":"0a7c2ff77d47bb4827c854de5f3042f4","url":"icons/icon-maskable-512.png"},{"revision":"8bca2f093ae5f7cc7f390ed06291ac58","url":"icons/icon.svg"},{"revision":"62f1bbb18785e01a3cbd65ec99760665","url":"icons/icon-maskable-192.png"},{"revision":"2cf00d7d513ae473adbaf2b7603dce46","url":"icons/icon-192.png"},{"revision":null,"url":"/_next/static/chunks/webpack-8003dbdf00643f48.js"},{"revision":null,"url":"/_next/static/chunks/52774a7f-5d9ba9e8464a4702.js"},{"revision":null,"url":"/_next/static/chunks/4bd1b696-e189204d92af36a5.js"},{"revision":null,"url":"/_next/static/chunks/1117-168384ad46674d07.js"},{"revision":null,"url":"/_next/static/chunks/main-app-d1f980ef6a3c3317.js"},{"revision":null,"url":"/_next/static/chunks/app/_not-found/page-8c9cde27bd21a2b5.js"},{"revision":null,"url":"/_next/static/chunks/app/global-error-caebbf61652f5490.js"},{"revision":null,"url":"/_next/static/css/6a2f52d52eb43cc6.css"},{"revision":null,"url":"/_next/static/chunks/4909-e3d08d657273044d.js"},{"revision":null,"url":"/_next/static/chunks/2619-0a8321071c1c6f07.js"},{"revision":null,"url":"/_next/static/chunks/3424-12067bb043f3e34a.js"},{"revision":null,"url":"/_next/static/chunks/app/layout-74b68221aab7d503.js"},{"revision":null,"url":"/_next/static/chunks/app/error-e3772033438d5a2d.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/dev/route-1e775984f82fd5fd.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/callback/route-007712b693d6650e.js"},{"revision":null,"url":"/_next/static/chunks/1812-1f18ead130d1e65d.js"},{"revision":null,"url":"/_next/static/chunks/app/(dev)/preview/page-b1a5fcdbd41d4d9c.js"},{"revision":null,"url":"/_next/static/chunks/app/home/error-c7b20da4b9fce37d.js"},{"revision":null,"url":"/_next/static/chunks/app/home/loading-a91854b1ecdd36a0.js"},{"revision":null,"url":"/_next/static/chunks/app/home/page-2512e2b82d1570e6.js"},{"revision":null,"url":"/_next/static/chunks/app/page-fce8c755514e8063.js"},{"revision":null,"url":"/_next/static/chunks/4263-cba315c3c0471827.js"},{"revision":null,"url":"/_next/static/chunks/app/profile/edit/health/page-e270b2904c98757a.js"},{"revision":null,"url":"/_next/static/chunks/app/recipes/[id]/page-fa56e150edf009ec.js"},{"revision":null,"url":"/_next/static/chunks/44530001-645b90b15a0ea3d2.js"},{"revision":null,"url":"/_next/static/chunks/8297-48bdf51e39338d6b.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/signup/page-38dc475bca4893eb.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/login/page-bfff59e218ae52ef.js"},{"revision":null,"url":"/_next/static/chunks/app/checkin/page-a18b7c85de54d9e0.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/error/page-d4033e13dfc02ba9.js"},{"revision":null,"url":"/_next/static/chunks/app/offline/loading-997c7bf69a5ed57b.js"},{"revision":null,"url":"/_next/static/chunks/app/offline/page-712748d1d1e63481.js"},{"revision":null,"url":"/_next/static/chunks/app/pantry/error-1dfb0b9223eeea8a.js"},{"revision":null,"url":"/_next/static/chunks/app/pantry/loading-044cb6f1b69ee787.js"},{"revision":null,"url":"/_next/static/chunks/3113-d8f27dcd14ab8523.js"},{"revision":null,"url":"/_next/static/chunks/app/pantry/page-57c01ca712a03373.js"},{"revision":null,"url":"/_next/static/chunks/app/profile/edit/page-c359db1673b962b2.js"},{"revision":null,"url":"/_next/static/chunks/app/feed-me/error-1a00c386704dc74e.js"},{"revision":null,"url":"/_next/static/chunks/app/feed-me/loading-d866170b70ceb43f.js"},{"revision":null,"url":"/_next/static/chunks/app/feed-me/page-73fcc1b1871e2c5a.js"},{"revision":null,"url":"/_next/static/chunks/app/profile/page-5c1a94319f3a04da.js"},{"revision":null,"url":"/_next/static/chunks/app/recipes/cooked/page-7480b67a10b07fcf.js"},{"revision":null,"url":"/_next/static/chunks/app/recipes/saved/page-eff1a0015bd401b8.js"},{"revision":null,"url":"/_next/static/chunks/app/onboarding/layout-553c3da957d2f25f.js"},{"revision":null,"url":"/_next/static/chunks/app/onboarding/page-9e281852b16487de.js"},{"revision":null,"url":"/_next/static/chunks/app/onboarding/health/page-b0e93125c2d889cc.js"},{"revision":null,"url":"/_next/static/chunks/3083-93b9cbaf468fe8f9.js"},{"revision":null,"url":"/_next/static/chunks/app/onboarding/step/[step]/page-b064e9882c64e320.js"},{"revision":null,"url":"/_next/static/chunks/framework-509bc090036f92b9.js"},{"revision":null,"url":"/_next/static/chunks/main-f5c30f913b450127.js"},{"revision":null,"url":"/_next/static/chunks/pages/_app-1cee2309d8edb8ea.js"},{"revision":null,"url":"/_next/static/chunks/pages/_error-f23c6682d663f8d6.js"}] ?? []);
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
