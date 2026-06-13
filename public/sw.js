const STATIC_CACHE = 'qs-static-v1';
const NAV_CACHE    = 'qs-nav-v1';
// Serve a cached navigation response if it is younger than this threshold.
const NAV_TTL_MS   = 10 * 60 * 1000; // 10 minutes

// Precache the main app shell during install so the NEXT open is instant.
// start_url is /hu — this is cached so the navigation handler can serve it
// without waiting for a Vercel cold start.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NAV_CACHE)
      .then((cache) => cache.add('/hu'))
      .catch(() => {}) // never block install on a precache failure
      .finally(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([STATIC_CACHE, NAV_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── Navigation (HTML pages) — stale-while-revalidate ─────────────────────
  // Cache key is always the FINAL url (after any server redirect) so that
  // /hu is cached as /hu regardless of what url triggered the navigation.
  if (request.method === 'GET' && request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(NAV_CACHE);

      // Normalise the key to the canonical app url.
      // start_url is /hu; middleware may redirect / → /hu.
      const cacheKey = new Request('/hu');
      const cached   = await cache.match(cacheKey);

      if (cached) {
        const dateHeader = cached.headers.get('date');
        const ageMs = dateHeader
          ? Date.now() - new Date(dateHeader).getTime()
          : Infinity;

        if (ageMs < NAV_TTL_MS) {
          // Serve immediately; refresh in background.
          fetch(request)
            .then((fresh) => { if (fresh.ok) cache.put(cacheKey, fresh); })
            .catch(() => {});
          return cached;
        }
      }

      // No fresh cache — go to network and store the result.
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(cacheKey, response.clone());
        return response;
      } catch {
        return cached ?? Response.error();
      }
    })());
    return;
  }

  // ── Next.js static bundles (JS/CSS) — cache-first ────────────────────────
  // Content-hashed URLs never go stale between deploys.
  if (request.method === 'GET' && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'Quintessence';
  const options = {
    body: payload.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: payload.url || '/hu' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/hu';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then((focusedClient) => {
            if ('navigate' in focusedClient) {
              return focusedClient.navigate(targetUrl);
            }
            return focusedClient;
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
