// CacheStorage is shared by every app on this origin (dathaze20.github.io),
// even across different service worker scopes - Forge is not the only app
// hosted there. CACHE_NAME must stay prefixed with CACHE_PREFIX, and cleanup
// below must only ever touch caches that start with this exact prefix, or a
// Forge deployment could delete another app's offline cache (e.g. Super
// Pong's) just by activating.
const CACHE_PREFIX = 'abel-arroyo-forge-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const STATIC_ASSETS = [
  './',
  './index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Deliberately no skipWaiting() here. A newly installed worker now sits in
  // "waiting" state until the page explicitly promotes it (see the message
  // listener below) - so an ordinary deployment never force-activates itself
  // and reloads the app out from under someone mid-generation or with unsaved
  // notes. See lib/swUpdate.ts for the user-gated update flow.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          // Only ever delete Forge's own obsolete caches - a bare `k !==
          // CACHE_NAME` here would also catch and delete every other app's
          // caches sharing this origin, since CacheStorage has no concept of
          // which service worker scope created an entry.
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// The page sends this only after the user has explicitly chosen to update
// (and, if needed, safely preserved their notes/draft first) - never
// automatically. See lib/swUpdate.ts's applyServiceWorkerUpdate().
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never touch the generation API - it's a POST and must always hit the network live
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // The update-check version file must always be a genuine live network
  // result. Never intercept it: not cached on success, never served from
  // the offline fallback cache either, so a device that is actually offline
  // gets a real failure instead of a stale "yes you're up to date".
  if (url.pathname.endsWith('/version.json')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
