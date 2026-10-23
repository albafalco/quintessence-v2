import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { loadFeherMagia, loadTraitTexts } from '@/lib/i18n-content';
import { loadPath } from '@/lib/magia/store';
import { loadMirrorData } from '@/lib/magia/mirror-store';
import { ROMAN_NUMERALS } from '@/lib/magia-utils';
import type { Locale } from '@/i18n';
import { MagiaTabs } from '@/components/feher-magia/MagiaTabs';
import { MirrorView } from '@/components/feher-magia/MirrorView';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'feherMagia.tabs' });
  return { title: t('tukor') };
}

interface TukorPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ciklus?: string }>;
}

export default async function TukorPage({ params, searchParams }: TukorPageProps) {
  const { locale } = await params;
  const { ciklus } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const path = await loadPath(supabase, user.id);
  if (!path?.gate_read_at) redirect(`/${locale}/modules/magia/kapu`);

  const [t, tNav, content, words, data] = await Promise.all([
    getTranslations('feherMagia.header'),
    getTranslations('nav'),
    loadFeherMagia(locale as Locale),
    loadTraitTexts(locale as Locale),
    loadMirrorData(supabase, user.id, ciklus ? parseInt(ciklus, 10) : undefined),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 xl:max-w-6xl">
      <header className="premium-card magia-surface p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t('fokozat', { roman: ROMAN_NUMERALS[path.fokozat] })}</p>
        <h1 className="font-display text-3xl font-bold text-gradient-gold">{tNav('magia')}</h1>
      </header>
      <MagiaTabs locale={locale} active="tukor" />
      <div className="animate-fade-up motion-reduce:animate-none">
        <MirrorView locale={locale} userId={user.id} data={data} words={words} elements={content.elements} />
      </div>
    </div>
  );
}
