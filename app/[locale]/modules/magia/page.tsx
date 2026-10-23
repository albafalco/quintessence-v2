import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { hasModuleAccess } from '@/lib/module-access';
import { createClient } from '@/lib/supabase/server';
import { loadMagiaFokozatok } from '@/lib/magia-data';
import type { Locale } from '@/i18n';
import { FokozatCard } from '@/components/magia/FokozatCard';
import type { MagiaProgressRecord } from '@/lib/magia-utils';
import type { SoulMirrorItem } from '@/lib/magia-types';
import { ElementBalance } from '@/components/magia/ElementBalance';
import { AppIcon } from '@/components/ui/AppIcon';
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

export default async function MagiaPage({ params }: MagiaPageProps) {
  const { locale } = await params;
  const t = await getTranslations('magia');
  const fokozatok = await loadMagiaFokozatok(locale as Locale);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The new Fehér Mágia path: this is its Utam tab
  if (user && (await hasModuleAccess(supabase, 'feher_magia'))) {
    const [data, content, tHeader, tNav] = await Promise.all([
      loadPathData(supabase, user.id),
      loadFeherMagia(locale as Locale),
      getTranslations('feherMagia.header'),
      getTranslations('nav'),
    ]);
    if (!data?.day.path.gate_read_at) redirect(`/${locale}/modules/magia/kapu`);
    const { path } = data.day;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
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
        <PathView locale={locale} data={data} content={content} />
      </div>
    );
  }

  let progress: MagiaProgressRecord[] = [];
  let mirrorItems: Pick<SoulMirrorItem, 'mirror' | 'element' | 'intensity' | 'resolved'>[] = [];

  if (user) {
    const { data } = await supabase
      .from('magia_progress')
      .select('fokozat, section, exercise_key, completed, notes, status, mastered_at, session_count')
      .eq('user_id', user.id);

    progress = (data ?? []) as MagiaProgressRecord[];

    const { data: mirrorData } = await supabase
      .from('magia_soul_mirror')
      .select('mirror, element, intensity, resolved')
      .eq('user_id', user.id);
    mirrorItems = (mirrorData ?? []) as typeof mirrorItems;
  }

  return (
    <div className="space-y-10">
      <header className="premium-card magia-surface p-4 sm:p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent/70">{t('initiationPath')}</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient-gold sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground leading-relaxed">{t('subtitle')}</p>
        {user && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/${locale}/modules/magia/ma`}
              className="inline-flex items-center gap-2 rounded-xl bg-accent/20 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/30 hover:shadow-glow-gold"
            >
              <AppIcon name="play" className="h-4 w-4 text-current" />
              {t('dailyPracticeButton')}
            </Link>
            <Link
              href={`/${locale}/modules/magia/jelentes`}
              className="inline-flex items-center gap-2 rounded-xl border border-accent/30 px-4 py-2.5 text-sm font-semibold text-accent/90 transition hover:bg-accent/10"
            >
              {t('reportButton')}
            </Link>
          </div>
        )}
      </header>

      {mirrorItems.some((i) => i.element) && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent/70">{t('elementBalanceSectionTitle')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-cream">
                <AppIcon name="heart" filled className="h-4 w-4" />
                {t('soulMirrorBlack')}
              </p>
              <ElementBalance items={mirrorItems} mirror="fekete" />
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-cream">
                <AppIcon name="heart" className="h-4 w-4" />
                {t('soulMirrorWhite')}
              </p>
              <ElementBalance items={mirrorItems} mirror="feher" />
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fokozatok.map((fokozat) => (
            <FokozatCard
              key={fokozat.id}
              fokozat={fokozat}
              locale={locale}
              progress={progress}
            />
          ))}
      </div>
    </div>
  );
}