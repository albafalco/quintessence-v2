import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Sparkles, BookOpen, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ModuleCard } from '@/components/dashboard/ModuleCard';
import {
  formatActivityDate,
  getAngolDashboardStats,
  getMagiaDashboardStats,
} from '@/lib/dashboard';
import { formatDate } from '@/lib/utils';
import { ShieldLogo } from '@/components/ui/ShieldLogo';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const tModules = await getTranslations({ locale, namespace: 'modules' });
  const tBrand = await getTranslations({ locale, namespace: 'brand' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, preferred_language')
    .eq('id', user.id)
    .single();

  const username = profile?.username ?? 'user';
  const showAngol = profile?.preferred_language === 'hu';

  const { data: magiaProgress } = await supabase
    .from('magia_progress')
    .select('fokozat, completed, completed_at')
    .eq('user_id', user.id);

  const magiaStats = getMagiaDashboardStats(magiaProgress ?? []);

  let angolStats = { progress: 0, lastActivity: null as string | null };
  if (showAngol) {
    const [{ data: cardProgress }, { data: unlocks }] = await Promise.all([
      supabase
        .from('angol_card_progress')
        .select('correct_count, last_seen')
        .eq('user_id', user.id),
      supabase
        .from('angol_section_unlocks')
        .select('section_id, unlocked_at')
        .eq('user_id', user.id)
        .eq('lesson_id', 1),
    ]);
    angolStats = getAngolDashboardStats(cardProgress ?? [], unlocks ?? []);
  }

  const today = formatDate(new Date(), locale);

  return (
    <div className="space-y-10">
      <section className="premium-card magia-surface relative overflow-hidden p-4 sm:p-6 md:p-10">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <ShieldLogo size={48} showGlow />
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent/80">
                {tBrand('name')}
              </p>
            </div>
            <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
              {t('welcome', { username })}
            </h1>
            <p className="text-muted-foreground">{t('date')}: {today}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-accent">
                <Sparkles className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{t('magiaLabel')}</span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-cream">
                {magiaStats.fokozatPercent}%
              </p>
              <p className="text-xs text-muted-foreground">
                {t('fokozat', { level: magiaStats.currentFokozat })}
              </p>
            </div>
            {showAngol && (
              <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{t('angolLabel')}</span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-cream">
                  {angolStats.progress}%
                </p>
                <p className="text-xs text-muted-foreground">{t('lesson1Progress')}</p>
              </div>
            )}
            <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-accent/70">
                <TrendingUp className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{t('totalLabel')}</span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-cream">
                {magiaStats.overallPercent}%
              </p>
              <p className="text-xs text-muted-foreground">{t('progress')}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-5 font-display text-xl font-semibold text-cream">{t('continue')}</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <ModuleCard
            title={tModules('magia.title')}
            subtitle={tModules('magia.subtitle')}
            href={`/${locale}/modules/magia`}
            progressType="ring"
            progress={magiaStats.fokozatPercent}
            progressLabel={t('fokozat', { level: magiaStats.currentFokozat })}
            lastActivity={formatActivityDate(magiaStats.lastActivity, locale)}
            icon="🔮"
            variant="magia"
          />

          {showAngol && (
            <ModuleCard
              title={tModules('angol.title')}
              subtitle={tModules('angol.subtitle')}
              href={`/${locale}/modules/angol`}
              progressType="bar"
              progress={angolStats.progress}
              progressLabel={t('lesson1Progress')}
              lastActivity={formatActivityDate(angolStats.lastActivity, locale)}
              icon="🇬🇧"
              variant="angol"
            />
          )}
        </div>
      </section>
    </div>
  );
}