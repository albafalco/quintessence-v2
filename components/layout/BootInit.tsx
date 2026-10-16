'use client';

import { useEffect } from 'react';
import { bootLog } from '@/lib/boot-logger';
const SW_RELOAD_KEY = 'qs-sw-reloaded';

function setupGlobalErrorHandlers() {
  const onError = (event: ErrorEvent) => {
    bootLog('window-error', { message: event.message, filename: event.filename, lineno: event.lineno });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    bootLog('unhandled-rejection', { reason: String(event.reason) });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    bootLog('sw-unsupported');
    return;
  }

  bootLog('sw-register-start');
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });
  bootLog('sw-registered', { scope: registration.scope, active: !!registration.active });

  if (registration.active) {
    bootLog('sw-active');
  }

  // Only reload when an existing worker is replaced by an update. On the very
  // first install clients.claim() also fires controllerchange, and reloading
  // then would wipe whatever a new visitor is typing (e.g. the login form).
  let hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (reloading || sessionStorage.getItem(SW_RELOAD_KEY)) return;
    reloading = true;
    sessionStorage.setItem(SW_RELOAD_KEY, '1');
    bootLog('sw-controller-change-reload');
    window.location.reload();
  });

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;

    bootLog('sw-update-found', { state: worker.state });

    worker.addEventListener('statechange', () => {
      bootLog('sw-state-change', { state: worker.state });

      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        worker.postMessage({ type: 'SKIP_WAITING' });
        bootLog('sw-skip-waiting-sent');
      }
    });
  });

  if (registration.waiting && navigator.serviceWorker.controller) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    bootLog('sw-waiting-skip-waiting-sent');
  }
}

export function BootInit() {
  useEffect(() => {
    (window as Window & { __qsReactMounted?: boolean }).__qsReactMounted = true;
    bootLog('client-mount');
    sessionStorage.removeItem(SW_RELOAD_KEY);

    const cleanupErrors = setupGlobalErrorHandlers();

    void registerServiceWorker()
      .then(() => bootLog('sw-register-finish'))
      .catch((err) => bootLog('sw-register-failed', { error: String(err) }));

    bootLog('first-render-effect');

    return () => {
      cleanupErrors();
    };
  }, []);

  return null;
}