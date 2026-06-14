import { Outfit, Cinzel } from 'next/font/google';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Quintessence - Personal Growth',
};
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales, type Locale } from '@/i18n';
import { BootInit } from '@/components/layout/BootInit';
import { ConditionalAppShell } from '@/components/layout/ConditionalAppShell';
import { GlobalErrorBoundary } from '@/components/layout/GlobalErrorBoundary';
import '../globals.css';

const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <head>
        {/* Dark background before stylesheet — prevents white flash on cold start */}
        <style>{`html,body{background-color:#0a0812}`}</style>

        {/* Preload splash logo so it appears instantly in the overlay below */}
        <link rel="preload" as="image" href="/logo-splash.png" />

        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#3B2A6E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* iOS PWA launch images — each entry must have EXACT pixel dimensions for its device */}
        <link rel="apple-touch-startup-image" href="/splash-1320x2868.png"
          media="screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-1206x2622.png"
          media="screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash.png"
          media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-1284x2778.png"
          media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-1179x2556.png"
          media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-1170x2532.png"
          media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-1125x2436.png"
          media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-828x1792.png"
          media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-750x1334.png"
          media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
      </head>
      <body className={`${outfit.variable} ${cinzel.variable} font-sans`}>
        <div
          id="app-splash"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0812',
            pointerEvents: 'none',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-splash.png" alt="" width={96} height={96} />
        </div>
        <BootInit />
        <GlobalErrorBoundary>
          <NextIntlClientProvider messages={messages}>
            <ConditionalAppShell>{children}</ConditionalAppShell>
          </NextIntlClientProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
