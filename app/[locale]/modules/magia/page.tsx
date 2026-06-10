import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { loadMagiaFokozatok } from '@/lib/magia-data';
import type { Locale } from '@/i18n';
import { FokozatCard } from '@/components/magia/FokozatCard';
import type { MagiaProgressRecord } from '@/lib/magia-utils';

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

  let progress: MagiaProgressRecord[] = [];

  if (user) {
    const { data } = await supabase
      .from('magia_progress')
      .select('fokozat, section, exercise_key, completed, notes, status, mastered_at, session_count')
      .eq('user_id', user.id);

    progress = (data ?? []) as MagiaProgressRecord[];
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
          <div className="mt-4">
            <Link
              href={`/${locale}/modules/magia/ma`}
              className="inline-flex items-center gap-2 rounded-xl bg-accent/20 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/30 hover:shadow-glow-gold"
            >
              {t('dailyPracticeButton')}
            </Link>
          </div>
        )}
      </header>

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