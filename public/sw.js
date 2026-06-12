const STATIC_CACHE = 'qs-static-v1';
const NAV_CACHE    = 'qs-nav-v1';
// Serve a cached navigation response if it is younger than this threshold.
const NAV_TTL_MS   = 10 * 60 * 1000; // 10 minutes

self.addEventListener('install', () => {
  self.skipWaiting();
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
  // On second+ opens the cached HTML is served immediately (no Vercel cold-start
  // wait), while a fresh copy is fetched in the background.
  if (request.method === 'GET' && request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache  = await caches.open(NAV_CACHE);
      const cached = await cache.match(request);

      if (cached) {
        const dateHeader = cached.headers.get('date');
        const ageMs = dateHeader
          ? Date.now() - new Date(dateHeader).getTime()
          : Infinity;

        if (ageMs < NAV_TTL_MS) {
          // Serve the cached response immediately; update in background.
          fetch(request)
            .then((fresh) => { if (fresh.ok) cache.put(request, fresh); })
            .catch(() => {});
          return cached;
        }
      }

      // No fresh cache — go to network.
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        // Offline fallback: serve stale if available.
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
