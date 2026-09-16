/* Kuumba Pro service worker
 * A conservative offline cache. Stale-while-revalidate for the pages, so a first
 * visit works normally, subsequent visits load instantly from cache, and updates
 * take effect on the next navigation. The 30-second reset works offline too.
 */
const VERSION = 'kuumba-v1';
const APP_SHELL = [
  '/kuumbapro-preview/',
  '/kuumbapro-preview/practice.html',
  '/kuumbapro-preview/jebbediah.html',
  '/kuumbapro-preview/about.html',
  '/kuumbapro-preview/work.html',
  '/kuumbapro-preview/book.html',
  '/kuumbapro-preview/watch.html',
  '/kuumbapro-preview/guide.html',
  '/kuumbapro-preview/speaker-kit.html',
  '/kuumbapro-preview/disclaimer.html',
  '/kuumbapro-preview/trademarks.html',
  '/kuumbapro-preview/privacy.html',
  '/kuumbapro-preview/terms.html',
  '/kuumbapro-preview/css/site.css',
  '/kuumbapro-preview/js/reset.js',
  '/kuumbapro-preview/assets/pwa/icon-192.png',
  '/kuumbapro-preview/assets/pwa/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only handle same-origin, only within our scope
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/kuumbapro-preview/')) return;

  // Never cache YouTube iframes, video, or third-party resources
  if (req.destination === 'video' || req.destination === 'audio') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      // Return cached fast if we have it, revalidate in background.
      // On navigations, prefer network first so updates land on next visit.
      if (req.mode === 'navigate') return network.catch(() => cached);
      return cached || network;
    })
  );
});
