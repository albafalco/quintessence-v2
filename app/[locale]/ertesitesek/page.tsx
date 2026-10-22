import { getTranslations } from 'next-intl/server';
import { NotificationsCenter } from '@/components/notifications/NotificationsCenter';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'notifications' });
  return { title: t('title') };
}

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'notifications' });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent/70">{t('pageEyebrow')}</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient-gold">{t('title')}</h1>
      </header>
      <NotificationsCenter />
    </div>
  );
}
