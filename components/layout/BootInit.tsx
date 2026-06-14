'use client';

import { useEffect } from 'react';
import { bootLog } from '@/lib/boot-logger';
import { SplashScreen } from './SplashScreen';

const SW_RELOAD_KEY = 'qs-sw-reloaded';
const DEBUG_LONG_PRESS_MS = 1200;

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('debug') || localStorage.getItem('qs-debug') === '1';
}

async function loadDebugConsole() {
  if (typeof window === 'undefined' || (window as Window & { eruda?: { init: () => void } }).eruda) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/eruda@3.4.1/eruda.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('eruda load failed'));
    document.head.appendChild(script);
  });

  const eruda = (window as Window & { eruda?: { init: () => void } }).eruda;
  eruda?.init();
  bootLog('debug-console-ready');
}

function setupDebugTriggers() {
  if (isDebugEnabled()) {
    void loadDebugConsole().catch((err) => bootLog('debug-console-failed', { error: String(err) }));
    return;
  }

  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  let startX = 0;
  let startY = 0;

  const onTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || touch.clientX > 48 || touch.clientY > 48) return;
    startX = touch.clientX;
    startY = touch.clientY;
    pressTimer = setTimeout(() => {
      localStorage.setItem('qs-debug', '1');
      void loadDebugConsole().catch((err) => bootLog('debug-console-failed', { error: String(err) }));
    }, DEBUG_LONG_PRESS_MS);
  };

  const onTouchEnd = () => {
    if (pressTimer) clearTimeout(pressTimer);
  };

  const onTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || !pressTimer) return;
    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);
    if (dx > 12 || dy > 12) {
      clearTimeout(pressTimer);
      pressTimer = undefined;
    }
  };

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: true });
  document.addEventListener('touchcancel', onTouchEnd, { passive: true });

  return () => {
    if (pressTimer) clearTimeout(pressTimer);
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchcancel', onTouchEnd);
  };
}

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
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  bootLog('sw-registered', { scope: registration.scope, active: !!registration.active });

  if (registration.active) {
    bootLog('sw-active');
  }

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
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
    bootLog('client-mount');
    sessionStorage.removeItem(SW_RELOAD_KEY);

    const cleanupDebug = setupDebugTriggers();
    const cleanupErrors = setupGlobalErrorHandlers();

    void registerServiceWorker()
      .then(() => bootLog('sw-register-finish'))
      .catch((err) => bootLog('sw-register-failed', { error: String(err) }));

    bootLog('first-render-effect');

    return () => {
      cleanupDebug?.();
      cleanupErrors();
    };
  }, []);

  return <SplashScreen />;
}