export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export async function waitForServiceWorker(timeoutMs = 15000): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('SERVICE_WORKER_UNSUPPORTED');
  }

  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

  // SW already active — return immediately (common case on subsequent visits).
  if (registration.active) {
    return registration;
  }

  // SW is installing for the first time — wait for it to activate.
  // We listen to statechange events instead of navigator.serviceWorker.ready,
  // because .ready can hang on iOS even when the SW is active.
  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SERVICE_WORKER_TIMEOUT')), timeoutMs);

    function tryResolve() {
      if (registration.active) {
        clearTimeout(timer);
        resolve(registration);
      }
    }

    function trackWorker(worker: ServiceWorker) {
      worker.addEventListener('statechange', tryResolve);
    }

    if (registration.installing) {
      trackWorker(registration.installing);
    } else if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      trackWorker(registration.waiting);
    }

    // Handle the case where a new worker appears after we checked
    registration.addEventListener('updatefound', () => {
      if (registration.installing) trackWorker(registration.installing);
    });

    // Final synchronous check in case the SW activated between register() and here
    tryResolve();
  });
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string | undefined {
  if (!buffer) return undefined;
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function subscriptionToPayload(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const endpoint = json.endpoint ?? subscription.endpoint;
  let p256dh = json.keys?.p256dh;
  let auth = json.keys?.auth;

  if (!p256dh || !auth) {
    p256dh = arrayBufferToBase64Url(subscription.getKey('p256dh'));
    auth = arrayBufferToBase64Url(subscription.getKey('auth'));
  }

  if (!endpoint || !p256dh || !auth) {
    throw new Error('INVALID_SUBSCRIPTION');
  }

  return { endpoint, p256dh, auth };
}

export async function subscribeToPush(): Promise<PushSubscription> {
  const registration = await waitForServiceWorker();
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidKey) {
    throw new Error('VAPID_MISSING');
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  return subscription;
}