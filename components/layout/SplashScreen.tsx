'use client';

import { useEffect } from 'react';

export function SplashScreen() {
  useEffect(() => {
    const el = document.getElementById('app-splash');
    if (!el) return;
    // Small delay so the user sees the branding at least briefly
    const fadeTimer = setTimeout(() => {
      el.style.transition = 'opacity 0.5s ease';
      el.style.opacity = '0';
    }, 300);
    const removeTimer = setTimeout(() => el.remove(), 850);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return null;
}
