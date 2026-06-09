import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  const locale = await getLocale();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-6xl font-bold text-primary">404</h1>
      <h2 className="mt-4 font-display text-2xl font-semibold">{t('title')}</h2>
      <p className="mt-2 max-w-md text-muted-foreground">{t('description')}</p>
      <Button asChild className="mt-8">
        <Link href={`/${locale}`}>{t('backHome')}</Link>
      </Button>
    </div>
  );
}