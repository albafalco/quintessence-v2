import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ShieldLogo } from '@/components/ui/ShieldLogo';
import { Button } from '@/components/ui/button';

// not-found.tsx receives no params, so the locale comes from next-intl.
export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'notFound' });

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <ShieldLogo size={72} />
      <p className="mt-6 font-display text-6xl font-bold text-gradient-gold">404</p>
      <h2 className="mt-4 font-display text-2xl font-semibold text-cream">{t('title')}</h2>
      <p className="mt-3 max-w-md text-muted-foreground">{t('description')}</p>
      <Button asChild variant="gold" className="mt-8">
        <Link href={`/${locale}`}>{t('backHome')}</Link>
      </Button>
    </div>
  );
}