const WPHQ_CACHE = "wphq-live-shell-v7-64-19";
const WPHQ_PRECACHE = [
  "./offline.html",
  "./live.html",
  "./live-following.html",
  "./live-login.html",
  "./manifest.webmanifest",
  "./css/site-shell.css?v=7.54.13",
  "./css/command-palette.css?v=7.53.4",
  "./js/site-shell.js?v=7.62.3",
  "./js/command-palette.js?v=7.62.2",
  "./css/wphq-brand-v7-64-18.css?v=7.64.18",
  "./assets/branding/wphq-logo-mark.png?v=7.64.19",
  "./assets/branding/wphq-logo-full.png?v=7.64.19",
  "./assets/app-icons/wphq-app-192.png?v=7.64.19",
  "./assets/app-icons/wphq-app-512.png?v=7.64.19",
  "./assets/app-icons/wphq-app-maskable-512.png?v=7.64.19",
  "./assets/app-icons/wphq-apple-touch-180.png?v=7.64.19"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(WPHQ_CACHE).then(cache => cache.addAll(WPHQ_PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => (key.startsWith("wpi-live-shell-") || key.startsWith("wphq-live-shell-")) && key !== WPHQ_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(WPHQ_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match("./offline.html"));
      }
    })());
    return;
  }

  const isStatic = /\.(?:css|js|png|svg|webp|ico|webmanifest)$/i.test(url.pathname);
  if (!isStatic) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(WPHQ_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw _;
    }
  })());
});
