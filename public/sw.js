"use strict";
(() => {
  // src/app/sw.ts
  importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js");
  if (!self.workbox) {
    console.error("[SW] Workbox failed to load \u2014 PWA offline support will not function.");
  }
  self.workbox.precaching.precacheAndRoute([{"revision":"a2760511c65806022ad20adf74370ff3","url":"window.svg"},{"revision":"2aaafa6a49b6563925fe440891e32717","url":"globe.svg"},{"revision":"ec6d3c7db59cb53417fa3dec70f41c9d","url":"manifest.webmanifest"},{"revision":"8e061864f388b47f33a1c3780831193e","url":"next.svg"},{"revision":"c0af2f507b369b085b35ef4bbe3bcf1e","url":"vercel.svg"},{"revision":"d09f95206c3fa0bb9bd9fefabfd0ea71","url":"file.svg"},{"revision":"d8f76af0168225972b1c86d212101840","url":"icons/icon-512.png"},{"revision":"0a7c2ff77d47bb4827c854de5f3042f4","url":"icons/icon-maskable-512.png"},{"revision":"8bca2f093ae5f7cc7f390ed06291ac58","url":"icons/icon.svg"},{"revision":"62f1bbb18785e01a3cbd65ec99760665","url":"icons/icon-maskable-192.png"},{"revision":"2cf00d7d513ae473adbaf2b7603dce46","url":"icons/icon-192.png"},{"revision":null,"url":"/_next/static/chunks/webpack-8cb741c77d6ed8f5.js"},{"revision":null,"url":"/_next/static/chunks/52774a7f-11518237add9943d.js"},{"revision":null,"url":"/_next/static/chunks/4bd1b696-e1e80304945e6227.js"},{"revision":null,"url":"/_next/static/chunks/1117-58a561fa0f467902.js"},{"revision":null,"url":"/_next/static/chunks/main-app-899af0b5a19bb0fb.js"},{"revision":null,"url":"/_next/static/chunks/app/_not-found/page-0794f994a7f756ad.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/callback/route-2f90f5c480426765.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/dev/route-6b7a1c90fd8a3d3f.js"},{"revision":null,"url":"/_next/static/chunks/app/global-error-0b5a078214f09631.js"},{"revision":null,"url":"/_next/static/css/73d5b85a6f696447.css"},{"revision":null,"url":"/_next/static/chunks/4909-335ae112086c28fd.js"},{"revision":null,"url":"/_next/static/chunks/2619-574b84d18da80f40.js"},{"revision":null,"url":"/_next/static/chunks/8720-ad778a59775bf89d.js"},{"revision":null,"url":"/_next/static/chunks/app/layout-0217a3af776958c5.js"},{"revision":null,"url":"/_next/static/chunks/app/error-90932c402492004b.js"},{"revision":null,"url":"/_next/static/chunks/app/api/cron/sync-integrations/route-5d660a48ef210d16.js"},{"revision":null,"url":"/_next/static/chunks/4447-894ec0fe328584a8.js"},{"revision":null,"url":"/_next/static/chunks/8706-c33b575479ea1a10.js"},{"revision":null,"url":"/_next/static/chunks/app/(dev)/preview/page-53b5f734326b70c4.js"},{"revision":null,"url":"/_next/static/chunks/app/home/error-ce60391670152a75.js"},{"revision":null,"url":"/_next/static/chunks/app/home/loading-0022fd5a7fe6ff21.js"},{"revision":null,"url":"/_next/static/chunks/app/home/page-fa376688ae2d2841.js"},{"revision":null,"url":"/_next/static/chunks/app/page-4f73056c6061ca9b.js"},{"revision":null,"url":"/_next/static/chunks/app/recipes/[id]/page-3a2a08a7e57a601f.js"},{"revision":null,"url":"/_next/static/chunks/9479-3c69888b0587a2d5.js"},{"revision":null,"url":"/_next/static/chunks/app/profile/edit/health/page-658686cae0f48ff3.js"},{"revision":null,"url":"/_next/static/chunks/44530001-98bc8933ba97b03d.js"},{"revision":null,"url":"/_next/static/chunks/4324-8e009851c706934e.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/signup/page-bf0147bf701defbc.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/login/page-d6a1f2a5e29c4607.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/error/page-2d78f703a04eabc2.js"},{"revision":null,"url":"/_next/static/chunks/app/offline/loading-f87ca0bc1559d966.js"},{"revision":null,"url":"/_next/static/chunks/app/offline/page-0ceb7dd3b8ad79e1.js"},{"revision":null,"url":"/_next/static/chunks/app/checkin/page-70413866ccb481e9.js"},{"revision":null,"url":"/_next/static/chunks/app/profile/edit/page-5a5d9fc338ab0325.js"},{"revision":null,"url":"/_next/static/chunks/app/feed-me/error-59abeee2fc0afa0d.js"},{"revision":null,"url":"/_next/static/chunks/app/feed-me/loading-f011e95bbbf3f832.js"},{"revision":null,"url":"/_next/static/chunks/9579-57586373fba4a131.js"},{"revision":null,"url":"/_next/static/chunks/app/feed-me/page-30dfffe92930ab5e.js"},{"revision":null,"url":"/_next/static/chunks/app/profile/page-04b5188680d0b78d.js"},{"revision":null,"url":"/_next/static/chunks/app/pantry/error-c1fb339bc83ba2f5.js"},{"revision":null,"url":"/_next/static/chunks/app/pantry/loading-e46f2a72c0a5517a.js"},{"revision":null,"url":"/_next/static/chunks/3593-48d664da718c112d.js"},{"revision":null,"url":"/_next/static/chunks/app/pantry/page-8851507372599bed.js"},{"revision":null,"url":"/_next/static/chunks/app/recipes/cooked/page-53731052e970b842.js"},{"revision":null,"url":"/_next/static/chunks/app/recipes/saved/page-265da0cabe915d5a.js"},{"revision":null,"url":"/_next/static/chunks/app/settings/integrations/page-04c441c8fde3d318.js"},{"revision":null,"url":"/_next/static/chunks/app/onboarding/layout-8beae4eab4e83bca.js"},{"revision":null,"url":"/_next/static/chunks/app/onboarding/health/page-f8406ad07706af03.js"},{"revision":null,"url":"/_next/static/chunks/app/onboarding/page-2dd8b6fab59d7553.js"},{"revision":null,"url":"/_next/static/chunks/3083-3f433a05592f2591.js"},{"revision":null,"url":"/_next/static/chunks/app/onboarding/step/[step]/page-3f3e15384df0d1f1.js"},{"revision":null,"url":"/_next/static/chunks/framework-3664c358d721d5ee.js"},{"revision":null,"url":"/_next/static/chunks/main-fedfadc3ccc03006.js"},{"revision":null,"url":"/_next/static/chunks/pages/_app-161b525a72b4e0df.js"},{"revision":null,"url":"/_next/static/chunks/pages/_error-26e3c78c392df61b.js"}] ?? []);
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
