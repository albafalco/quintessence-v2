import type { MetadataRoute } from 'next';
import huMessages from '@/messages/hu.json';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: huMessages.pwa.name,
    short_name: huMessages.pwa.name,
    description: huMessages.pwa.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0812',
    theme_color: '#3B2A6E',
    orientation: 'any',
    icons: [
      {
        src: '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}