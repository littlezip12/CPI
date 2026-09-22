const WPI_CACHE = "wpi-live-shell-v7-64-17";
const WPI_PRECACHE = [
  "./offline.html",
  "./live.html",
  "./live-following.html",
  "./live-login.html",
  "./manifest.webmanifest",
  "./css/site-shell.css?v=7.54.13",
  "./css/command-palette.css?v=7.53.4",
  "./js/site-shell.js?v=7.62.3",
  "./js/command-palette.js?v=7.62.2",
  "./assets/branding/wpi-logo-mark.png",
  "./assets/branding/wpi-logo-full.png",
  "./assets/app-icons/wpi-app-192.png",
  "./assets/app-icons/wpi-app-512.png",
  "./assets/app-icons/wpi-app-maskable-512.png",
  "./assets/app-icons/wpi-apple-touch-180.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(WPI_CACHE).then(cache => cache.addAll(WPI_PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("wpi-live-shell-") && key !== WPI_CACHE).map(key => caches.delete(key)));
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
          const cache = await caches.open(WPI_CACHE);
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
        const cache = await caches.open(WPI_CACHE);
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
