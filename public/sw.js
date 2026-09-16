// Blockwork service worker — app-shell cache for installability + offline
// fallback. Network-first for everything (API, assets); the cached shell
// only serves as a last-resort fallback when the network is unavailable.
const CACHE_NAME = "blockwork-shell-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Never intercept API/backend function calls — always go to network.
  if (url.pathname.startsWith("/functions/")) return;

  // Network-first; fall back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cache successful same-origin navigations for offline fallback.
        if (res.ok && url.origin === self.location.origin && req.mode === "navigate") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Only serve the app shell for navigation requests. Serving HTML
        // for a JS/CSS/asset request makes the browser parse HTML as
        // JavaScript → "SyntaxError: Unexpected token '<'".
        if (req.mode === "navigate") {
          const shell = await caches.match("/index.html");
          if (shell) return shell;
        }
        return new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
      })
  );
});
