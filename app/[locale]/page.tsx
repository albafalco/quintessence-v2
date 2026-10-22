import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('dashboard') };
}

export default function DashboardPage() {
  return <DashboardContent />;
}