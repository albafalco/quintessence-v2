import { Outfit, Cinzel } from 'next/font/google';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Quintessence - Personal Growth',
};
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales, type Locale } from '@/i18n';
import { ConditionalAppShell } from '@/components/layout/ConditionalAppShell';
import { ServiceWorkerInit } from '@/components/layout/ServiceWorkerInit';
import { SplashScreen } from '@/components/layout/SplashScreen';
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
        {/* Inline background prevents white flash on iOS PWA cold start,
            before the external stylesheet is loaded and parsed. */}
        <style>{`html,body{background-color:#0a0812}`}</style>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#3B2A6E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-startup-image" href="/splash.png" />
      </head>
      <body className={`${outfit.variable} ${cinzel.variable} font-sans`}>
        {/*
          Inline-styled splash overlay — visible in the initial HTML before any
          CSS or JS loads. SplashScreen (client component) fades it out once
          React has hydrated, giving a smooth branded cold-start experience.
        */}
        <div
          id="app-splash"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#0a0812',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            pointerEvents: 'none',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="" width={80} height={80} style={{ borderRadius: '20%' }} />
          <div
            style={{
              color: '#C9A84C',
              fontSize: '32px',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontWeight: 'bold',
              letterSpacing: '0.02em',
            }}
          >
            Quintessence
          </div>
          <div
            style={{
              color: '#7B7A9A',
              fontSize: '11px',
              fontFamily: '-apple-system, sans-serif',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
            }}
          >
            Personal Growth
          </div>
        </div>
        <SplashScreen />
        <ServiceWorkerInit />
        <NextIntlClientProvider messages={messages}>
          <ConditionalAppShell>{children}</ConditionalAppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}