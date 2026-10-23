import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n';
import { loadFeherMagia } from '@/lib/i18n-content';
import { loadPathData } from '@/lib/magia/path-store';
import { ROMAN_NUMERALS } from '@/lib/magia-utils';
import { MagiaTabs } from '@/components/feher-magia/MagiaTabs';
import { PathView } from '@/components/feher-magia/PathView';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('magia') };
}

interface MagiaPageProps {
  params: Promise<{ locale: string }>;
}

/** Fehér Mágia: the Utam tab (the path starts with the Gate). */
export default async function MagiaPage({ params }: MagiaPageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const [data, content, tHeader, tNav] = await Promise.all([
    loadPathData(supabase, user.id),
    loadFeherMagia(locale as Locale),
    getTranslations('feherMagia.header'),
    getTranslations('nav'),
  ]);
  if (!data?.day.path.gate_read_at) redirect(`/${locale}/modules/magia/kapu`);
  const { path } = data.day;
  return (
    <div className="mx-auto max-w-2xl space-y-5 xl:max-w-6xl">
      <header className="premium-card magia-surface p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">
          {tHeader('fokozat', { roman: ROMAN_NUMERALS[path.fokozat] })} · {tHeader('day', { day: data.day.completedEvenings + 1 })}
        </p>
        <h1 className="font-display text-3xl font-bold text-gradient-gold">{tNav('magia')}</h1>
        {path.wish && (
          <p className="mt-2 inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
            {tHeader('wish', { wish: path.wish })}
          </p>
        )}
      </header>
      <MagiaTabs locale={locale} active="utam" />
      <div className="animate-fade-up motion-reduce:animate-none">
        <PathView locale={locale} data={data} content={content} />
      </div>
    </div>
  );
}
