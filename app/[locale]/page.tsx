import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleCard } from '@/components/dashboard/ModuleCard';
import {
  formatActivityDate,
  getAngolDashboardStats,
  getMagiaDashboardStats,
} from '@/lib/dashboard';
import { formatDate } from '@/lib/utils';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const tModules = await getTranslations({ locale, namespace: 'modules' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, preferred_language')
    .eq('id', user!.id)
    .single();

  const username = profile?.username ?? 'user';
  const showAngol = profile?.preferred_language === 'hu';

  const { data: magiaProgress } = await supabase
    .from('magia_progress')
    .select('fokozat, completed, completed_at')
    .eq('user_id', user!.id);

  const magiaStats = getMagiaDashboardStats(magiaProgress ?? []);

  let angolStats = { progress: 0, lastActivity: null as string | null, progressLabel: '1. Lecke' };
  if (showAngol) {
    const [{ data: cardProgress }, { data: unlocks }] = await Promise.all([
      supabase
        .from('angol_card_progress')
        .select('correct_count, last_seen')
        .eq('user_id', user!.id),
      supabase
        .from('angol_section_unlocks')
        .select('section_id, unlocked_at')
        .eq('user_id', user!.id)
        .eq('lesson_id', 1),
    ]);
    angolStats = getAngolDashboardStats(cardProgress ?? [], unlocks ?? []);
  }

  const today = formatDate(new Date(), locale);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="rounded-xl border border-border bg-card p-6">
        <h1 className="font-display text-2xl font-semibold md:text-3xl">
          {t('welcome', { username })}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t('date')}: {today}
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <ModuleCard
          title={tModules('magia.title')}
          subtitle={tModules('magia.subtitle')}
          href={`/${locale}/modules/magia`}
          progressType="ring"
          progress={magiaStats.fokozatPercent}
          progressLabel={t('fokozat', { level: magiaStats.currentFokozat })}
          lastActivity={formatActivityDate(magiaStats.lastActivity, locale)}
          icon="🔮"
        />

        {showAngol && (
          <ModuleCard
            title={tModules('angol.title')}
            subtitle={tModules('angol.subtitle')}
            href={`/${locale}/modules/angol`}
            progressType="bar"
            progress={angolStats.progress}
            progressLabel={angolStats.progressLabel}
            lastActivity={formatActivityDate(angolStats.lastActivity, locale)}
            icon="🇬🇧"
          />
        )}
      </section>
    </div>
  );
}