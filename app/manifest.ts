import type { MetadataRoute } from 'next';
import huMessages from '@/messages/hu.json';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: huMessages.pwa.name,
    short_name: huMessages.pwa.name,
    description: huMessages.pwa.description,
    start_url: '/hu',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#0a0812',
    theme_color: '#3B2A6E',
    orientation: 'any',
    icons: [
      // 'any' purpose required for Chrome/Edge desktop install button
      { src: '/favicon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // 'maskable' for adaptive icons (Android home screen)
      { src: '/favicon.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/favicon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}