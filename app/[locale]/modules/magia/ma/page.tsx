import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { loadTodayData } from '@/lib/magia/store';
import { TodayPage } from '@/components/feher-magia/TodayPage';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'feherMagia.tabs' });
  return { title: t('ma') };
}

interface MaMagiaPageProps {
  params: Promise<{ locale: string }>;
  /** ?jegyzet=1: the dashboard's "+" (and the app icon shortcut) opens a note; ?este=1: the evening reminder opens the evening */
  searchParams: Promise<{ jegyzet?: string; este?: string }>;
}

export default async function MaMagiaPage({ params, searchParams }: MaMagiaPageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const data = await loadTodayData(supabase, user.id);
  if (!data?.path.gate_read_at) redirect(`/${locale}/modules/magia/kapu`);
  const { jegyzet, este } = await searchParams;
  return <TodayPage locale={locale} userId={user.id} data={data} openNote={jegyzet === '1'} openEvening={este === '1'} />;
}
