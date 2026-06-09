import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ShieldLogo } from '@/components/ui/ShieldLogo';
import { Button } from '@/components/ui/button';

export default async function NotFound({
  params,
}: {
  params?: Promise<{ locale: string }>;
}) {
  const locale = params ? (await params).locale : 'hu';
  const t = await getTranslations({ locale, namespace: 'notFound' });

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <ShieldLogo size={72} showGlow />
      <p className="mt-6 font-display text-6xl font-bold text-gradient-gold">404</p>
      <h2 className="mt-4 font-display text-2xl font-semibold text-cream">{t('title')}</h2>
      <p className="mt-3 max-w-md text-muted-foreground">{t('description')}</p>
      <Button asChild variant="gold" className="mt-8">
        <Link href={`/${locale}`}>{t('backHome')}</Link>
      </Button>
    </div>
  );
}