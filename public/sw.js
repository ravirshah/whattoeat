"use strict";
(() => {
  // src/app/sw.ts
  importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js");
  if (!self.workbox) {
    console.error("[SW] Workbox failed to load \u2014 PWA offline support will not function.");
  }
  self.workbox.precaching.precacheAndRoute([{"revision":"a2760511c65806022ad20adf74370ff3","url":"window.svg"},{"revision":"2aaafa6a49b6563925fe440891e32717","url":"globe.svg"},{"revision":"ec6d3c7db59cb53417fa3dec70f41c9d","url":"manifest.webmanifest"},{"revision":"8e061864f388b47f33a1c3780831193e","url":"next.svg"},{"revision":"c0af2f507b369b085b35ef4bbe3bcf1e","url":"vercel.svg"},{"revision":"d09f95206c3fa0bb9bd9fefabfd0ea71","url":"file.svg"},{"revision":"d8f76af0168225972b1c86d212101840","url":"icons/icon-512.png"},{"revision":"0a7c2ff77d47bb4827c854de5f3042f4","url":"icons/icon-maskable-512.png"},{"revision":"8bca2f093ae5f7cc7f390ed06291ac58","url":"icons/icon.svg"},{"revision":"62f1bbb18785e01a3cbd65ec99760665","url":"icons/icon-maskable-192.png"},{"revision":"2cf00d7d513ae473adbaf2b7603dce46","url":"icons/icon-192.png"},{"revision":null,"url":"/_next/static/chunks/webpack-50cb68b5cb41e38c.js"},{"revision":null,"url":"/_next/static/chunks/52774a7f-e4408228fa62388d.js"},{"revision":null,"url":"/_next/static/chunks/4bd1b696-b763e002a44211ed.js"},{"revision":null,"url":"/_next/static/chunks/117-8a31e089cee6e159.js"},{"revision":null,"url":"/_next/static/chunks/main-app-2056f32ada210a9f.js"},{"revision":null,"url":"/_next/static/chunks/app/_not-found/page-b0662ed15ead7416.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/callback/route-df88e03404d9355f.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/dev/route-5daa1980a32aa10a.js"},{"revision":null,"url":"/_next/static/chunks/app/global-error-0461c2ab4b8c512b.js"},{"revision":null,"url":"/_next/static/css/c15e7274baa2f900.css"},{"revision":null,"url":"/_next/static/chunks/720-38cb7ddaa3dafcac.js"},{"revision":null,"url":"/_next/static/chunks/app/layout-cb5b6b480d742489.js"},{"revision":null,"url":"/_next/static/chunks/app/error-d598ad20ec1d75f2.js"},{"revision":null,"url":"/_next/static/chunks/909-c72ae46c1dc7c36e.js"},{"revision":null,"url":"/_next/static/chunks/812-92dacdfcef805607.js"},{"revision":null,"url":"/_next/static/chunks/app/(dev)/preview/page-2c3bd1035de263d7.js"},{"revision":null,"url":"/_next/static/chunks/app/home/error-7187051f28bee618.js"},{"revision":null,"url":"/_next/static/chunks/app/home/loading-0e216aeb1afc73a8.js"},{"revision":null,"url":"/_next/static/chunks/619-3e3df32a650dc440.js"},{"revision":null,"url":"/_next/static/chunks/app/home/page-3e188f3b5206867a.js"},{"revision":null,"url":"/_next/static/chunks/app/page-5a0fd9c628eb0d1a.js"},{"revision":null,"url":"/_next/static/chunks/app/recipes/[id]/page-b8e912a796735c93.js"},{"revision":null,"url":"/_next/static/chunks/44530001-43bd91145eef5af2.js"},{"revision":null,"url":"/_next/static/chunks/297-26f69d0ceab59ef3.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/login/page-e598820a4034f957.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/error/page-539d39b9e1a0cecd.js"},{"revision":null,"url":"/_next/static/chunks/app/checkin/page-46dc9bf56e3b4871.js"},{"revision":null,"url":"/_next/static/chunks/app/auth/signup/page-8c86d6dfa64673a5.js"},{"revision":null,"url":"/_next/static/chunks/app/offline/loading-f205862acfc60589.js"},{"revision":null,"url":"/_next/static/chunks/app/offline/page-929348d3561b8656.js"},{"revision":null,"url":"/_next/static/chunks/app/feed-me/error-32024fd0a98f0e0e.js"},{"revision":null,"url":"/_next/static/chunks/app/feed-me/loading-fc4e362725cde80a.js"},{"revision":null,"url":"/_next/static/chunks/120-5db1f9f3b6a94d60.js"},{"revision":null,"url":"/_next/static/chunks/app/feed-me/page-b3592b48269823d5.js"},{"revision":null,"url":"/_next/static/chunks/783-fed22070854d687e.js"},{"revision":null,"url":"/_next/static/chunks/app/profile/edit/page-4bab872b1f1a783c.js"},{"revision":null,"url":"/_next/static/chunks/app/pantry/error-40b0dee5aa79851a.js"},{"revision":null,"url":"/_next/static/chunks/app/pantry/loading-cf6af12933c4db6e.js"},{"revision":null,"url":"/_next/static/chunks/app/pantry/page-5e5ba6d28ef5fff9.js"},{"revision":null,"url":"/_next/static/chunks/app/profile/page-4ceddb336dee1103.js"},{"revision":null,"url":"/_next/static/chunks/app/recipes/cooked/page-c55ac8925438635f.js"},{"revision":null,"url":"/_next/static/chunks/app/recipes/saved/page-bc0dd3d70006ffba.js"},{"revision":null,"url":"/_next/static/chunks/app/onboarding/layout-cc107686622bf3d1.js"},{"revision":null,"url":"/_next/static/chunks/app/onboarding/page-34f31fdc93d62fb9.js"},{"revision":null,"url":"/_next/static/chunks/app/onboarding/step/[step]/page-e75ecd00e31586f4.js"},{"revision":null,"url":"/_next/static/chunks/framework-9e505ecbf29946d5.js"},{"revision":null,"url":"/_next/static/chunks/main-b34ce996b79bd151.js"},{"revision":null,"url":"/_next/static/chunks/pages/_app-9c8bb599d87a70da.js"},{"revision":null,"url":"/_next/static/chunks/pages/_error-22e96bcb51cff931.js"}] ?? []);
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
