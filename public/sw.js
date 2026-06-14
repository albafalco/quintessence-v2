const STATIC_CACHE = 'qs-static-v2';
const NAV_CACHE = 'qs-nav-v2';
const OFFLINE_URL = '/offline.html';
const NAV_NETWORK_TIMEOUT_MS = 6000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(NAV_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => {})
      .finally(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([STATIC_CACHE, NAV_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'GET' && request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(NAV_CACHE);

        try {
          const response = await fetchWithTimeout(request, NAV_NETWORK_TIMEOUT_MS);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;

          const offline = await cache.match(OFFLINE_URL);
          if (offline) return offline;

          return Response.error();
        }
      })()
    );
    return;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;

        try {
          const response = await fetchWithTimeout(request, NAV_NETWORK_TIMEOUT_MS);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return hit ?? Response.error();
        }
      })()
    );
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