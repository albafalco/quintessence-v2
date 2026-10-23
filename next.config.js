const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n.ts');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: { remotePatterns: [] },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Pages of the earlier Fehér Mágia module (old links, bookmarks, notifications)
  async redirects() {
    return [
      { source: '/:locale/modules/magia/fokozat/:id', destination: '/:locale/modules/magia', permanent: false },
      { source: '/:locale/modules/magia/jelentes', destination: '/:locale/modules/magia/tukor', permanent: false },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
