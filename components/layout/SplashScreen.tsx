'use client';

import { useEffect } from 'react';
import { bootLog } from '@/lib/boot-logger';

export function SplashScreen() {
  useEffect(() => {
    const el = document.getElementById('app-splash');
    if (!el) return;
    bootLog('splash-overlay-mounted');
    const fadeTimer = setTimeout(() => {
      el.style.transition = 'opacity 0.6s ease';
      el.style.opacity = '0';
      bootLog('splash-overlay-fade-start');
    }, 800);
    const removeTimer = setTimeout(() => {
      el.remove();
      bootLog('splash-overlay-removed');
    }, 1500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return null;
}
