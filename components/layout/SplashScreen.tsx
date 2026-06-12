'use client';

import { useEffect } from 'react';

export function SplashScreen() {
  useEffect(() => {
    const el = document.getElementById('app-splash');
    if (!el) return;
    // Wait 800ms after React mounts before fading — ensures splash is visible
    // even on fast desktop loads, and gives iOS adequate branding time.
    const fadeTimer = setTimeout(() => {
      el.style.transition = 'opacity 0.6s ease';
      el.style.opacity = '0';
    }, 800);
    const removeTimer = setTimeout(() => el.remove(), 1500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return null;
}
