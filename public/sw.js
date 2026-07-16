const PAGES_CACHE_NAME = 'interview-pages-v2';
const ASSETS_CACHE_NAME = 'interview-assets-v2';
const KNOWN_CACHES = [PAGES_CACHE_NAME, ASSETS_CACHE_NAME];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !KNOWN_CACHES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim())
      .then(() =>
        // Tell all open tabs to reload so they get fresh chunks after an SW update
        self.clients
          .matchAll({ type: 'window' })
          .then((clients) =>
            clients.forEach((client) =>
              client.postMessage({ type: 'SW_UPDATED' }),
            ),
          ),
      ),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML pages): NetworkFirst
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(PAGES_CACHE_NAME)
              .then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request, { cacheName: PAGES_CACHE_NAME }).then(
            (cached) =>
              cached ??
              new Response('You are offline', {
                status: 503,
                headers: { 'Content-Type': 'text/plain' },
              }),
          ),
        ),
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images): CacheFirst
  // Only cache /_next/static/ paths — these have content hashes and are safe to cache long-term
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request, { cacheName: ASSETS_CACHE_NAME }).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(ASSETS_CACHE_NAME)
              .then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }
});
