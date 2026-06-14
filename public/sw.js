const STATIC_CACHE = 'qs-static-v3';
const NAV_CACHE = 'qs-nav-v3';
const OFFLINE_URL = '/offline.html';
const NAV_NETWORK_TIMEOUT_MS = 8000;
const NAV_MAX_ATTEMPTS = 2;
const STATIC_NETWORK_TIMEOUT_MS = 10000;

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
      .then(() => caches.open(NAV_CACHE))
      .then((cache) =>
        cache.keys().then((keys) => Promise.all(keys.map((key) => cache.delete(key))))
      )
      .then(() => caches.open(NAV_CACHE).then((cache) => cache.add(OFFLINE_URL)))
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

async function fetchNavigation(request) {
  let lastError;

  for (let attempt = 0; attempt < NAV_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(request, NAV_NETWORK_TIMEOUT_MS);
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('NAV_FETCH_FAILED');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Next.js App Router HTML must never be served from cache — only live network.
  if (request.method === 'GET' && request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetchNavigation(request);
        } catch {
          const offline = await caches.match(OFFLINE_URL);
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

        if (hit) {
          fetchWithTimeout(request, STATIC_NETWORK_TIMEOUT_MS)
            .then((fresh) => {
              if (fresh.ok) cache.put(request, fresh.clone());
            })
            .catch(() => {});
          return hit;
        }

        try {
          const response = await fetchWithTimeout(request, STATIC_NETWORK_TIMEOUT_MS);
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