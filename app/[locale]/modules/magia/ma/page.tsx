import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { loadMagiaFokozatok } from '@/lib/magia-data';
import type { Locale } from '@/i18n';
import { ExerciseItem } from '@/components/magia/ExerciseItem';
import { StreakCalendar } from '@/components/magia/StreakCalendar';
import { PillarBalanceChart } from '@/components/magia/PillarBalance';
import {
  buildExerciseKey,
  computeHeatmap,
  computePillarBalance,
  computeStreak,
  getCurrentFokozatId,
  computeRatingStats,
  isReadyForMastery,
} from '@/lib/magia-utils';
import { getBudapestNow, toBudapestDate } from '@/lib/push-reminders';
import { buildDailyPlan } from '@/lib/magia-plan';
import type { MagiaProgressRecord, SessionRecord } from '@/lib/magia-utils';
import { AppIcon } from '@/components/ui/AppIcon';

interface MaMagiaPageProps {
  params: Promise<{ locale: string }>;
}

export default async function MaMagiaPage({ params }: MaMagiaPageProps) {
  const { locale } = await params;
  const t = await getTranslations('magia');
  const fokozatok = await loadMagiaFokozatok(locale as Locale);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const budapestNow = getBudapestNow();
  const todayDate = budapestNow.date;

  const statsWindowStart = new Date(Date.now() - 35 * 86400000).toISOString();
  // The streak can be longer than the 35-day stats window, so it gets its own
  // lightweight query over the past year.
  const streakWindowStart = new Date(Date.now() - 366 * 86400000).toISOString();

  const [{ data: progressData }, { data: sessionsData }, { data: streakData }, { data: ratedData }] = await Promise.all([
    supabase
      .from('magia_progress')
      .select('fokozat, section, exercise_key, completed, notes, status, mastered_at, session_count')
      .eq('user_id', user.id),
    supabase
      .from('magia_sessions')
      .select('id, fokozat, section, exercise_key, started_at, duration_sec, completed')
      .eq('user_id', user.id)
      .gte('started_at', statsWindowStart)
      .order('started_at', { ascending: false }),
    supabase
      .from('magia_sessions')
      .select('started_at, completed')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('started_at', streakWindowStart),
    supabase
      .from('magia_sessions')
      .select('exercise_key, rating, started_at')
      .eq('user_id', user.id)
      .not('rating', 'is', null)
      .order('started_at', { ascending: false })
      .limit(1000),
  ]);

  const ratingStats = computeRatingStats(
    (ratedData ?? []) as { exercise_key: string; rating: number | null; started_at: string }[]
  );

  const allProgress = (progressData ?? []) as MagiaProgressRecord[];
  const recentSessions = (sessionsData ?? []) as SessionRecord[];

  const currentFokozatId = getCurrentFokozatId(allProgress);
  const fokozat = fokozatok.find((f) => f.id === currentFokozatId)!;

  const streak = computeStreak((streakData ?? []) as Pick<SessionRecord, 'started_at' | 'completed'>[], todayDate);
  const heatmapData = computeHeatmap(recentSessions, todayDate, 35);
  const pillarBalance = computePillarBalance(recentSessions);

  const todaySessions = recentSessions.filter((s) => toBudapestDate(s.started_at) === todayDate);
  const planExercises = buildDailyPlan(
    fokozat,
    allProgress,
    todaySessions.map((s) => s.exercise_key)
  );

  // Exercises of today's plan that look ready to be marked as mastered
  const readyTitles = Array.from(
    new Set(
      planExercises
        .filter((item) =>
          Boolean(item.exercise.successCriteria) &&
          isReadyForMastery({
            status: item.progress.status,
            sessionCount: item.progress.sessionCount,
            minSessions: item.exercise.minSessions ?? 10,
            rating: ratingStats[buildExerciseKey(item.section, currentFokozatId, item.exercise.key)],
          })
        )
        .map((item) => item.exercise.cim)
    )
  );

  const pillarIcon = { szellem: 'brain', lelek: 'gem', test: 'zap' } as const;
  const sectionLabel = { szellem: t('szellem'), lelek: t('lelek'), test: t('test') } as const;

  const formattedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(todayDate));

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header className="premium-card magia-surface p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">
              {t('maBadge')}
            </p>
            <h1 className="font-display text-3xl font-bold text-gradient-gold">
              {t('maTitle')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formattedDate}
              {' · '}
              {fokozat.rovidcim}
            </p>
          </div>
          {streak > 0 && (
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-accent/10 px-4 py-3 shadow-glow-gold">
              <AppIcon name="flame" className="h-6 w-6" />
              <span className="font-display text-xl font-bold text-accent">{streak}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-accent/70">{t('maStreak')}</span>
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-3">
          <Link
            href={`/${locale}/modules/magia`}
            className="text-xs text-muted-foreground transition hover:text-accent"
          >
            {t('maBackToAll')}
          </Link>
          <Link
            href={`/${locale}/modules/magia/fokozat/${currentFokozatId}`}
            className="text-xs text-muted-foreground transition hover:text-accent"
          >
            {t('maLevelDetails', { title: fokozat.rovidcim })}
          </Link>
          <Link
            href={`/${locale}/modules/magia/jelentes`}
            className="text-xs text-muted-foreground transition hover:text-accent"
          >
            {t('reportButton')}
          </Link>
        </div>
      </header>

      {readyTitles.length > 0 && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-sm text-cream/90">
          <p className="font-semibold text-accent">✦ {t('readyForMasteryNote', { count: readyTitles.length })}</p>
          <p className="mt-1 text-xs text-muted-foreground">{readyTitles.join(' · ')}</p>
        </div>
      )}

      {/* Napi terv */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent/70">
          <span className="h-px flex-1 bg-gradient-to-r from-accent/40 to-transparent" />
          {t('maTodayPlan')}
          <span className="h-px flex-1 bg-gradient-to-l from-accent/40 to-transparent" />
        </h2>

        {planExercises.length === 0 ? (
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6 text-center">
            <AppIcon name="party" className="mb-2 h-7 w-7" />
            <p className="font-display text-lg font-semibold text-cream">
              {t('maAllMastered')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('maAllMasteredDesc', { title: fokozat.cim })}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {planExercises.map((item, idx) => {
              const label = item.slot !== undefined
                ? `${sectionLabel[item.section]} — ${item.slot === 0 ? t('morning') : t('evening')}`
                : sectionLabel[item.section];

              return (
                <div key={`${item.exercise.key}-${idx}`} className={item.doneToday ? 'opacity-50' : ''}>
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    <AppIcon name={pillarIcon[item.section]} className="h-3 w-3" />
                    {label}
                    {item.doneToday && <span className="ml-2 text-accent/60">{t('maCompletedToday')}</span>}
                  </p>
                  <ExerciseItem
                    fokozatId={currentFokozatId}
                    section={item.section}
                    exerciseKey={item.exercise.key}
                    title={item.exercise.cim}
                    description={item.exercise.leiras}
                    type={item.exercise.type}
                    params={item.exercise.params}
                    successCriteria={item.exercise.successCriteria}
                    minSessions={item.exercise.minSessions ?? 10}
                    initialCompleted={item.progress.completed}
                    initialNotes={item.progress.notes}
                    initialStatus={item.progress.status}
                    initialSessionCount={item.progress.sessionCount}
                    recentRating={ratingStats[buildExerciseKey(item.section, currentFokozatId, item.exercise.key)]}
                    userId={user.id}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Hőtérkép */}
      <section className="rounded-2xl border border-border/40 bg-card/20 p-5">
        <StreakCalendar data={heatmapData} streak={streak} />
      </section>

      {/* Pillér-egyensúly */}
      <PillarBalanceChart balance={pillarBalance} />

      {/* Heti statisztika */}
      {recentSessions.length > 0 && (
        <section className="rounded-2xl border border-border/40 bg-card/20 p-5">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-accent/70">
            {t('maStatsTitle')}
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-display text-2xl font-bold text-accent">{recentSessions.length}</p>
              <p className="text-xs text-muted-foreground">{t('maStatsSessions')}</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-accent">
                {Math.floor(recentSessions.reduce((s, r) => s + (r.duration_sec ?? 0), 0) / 60)}
              </p>
              <p className="text-xs text-muted-foreground">{t('maStatsTotalMin')}</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-accent">
                {recentSessions.length > 0
                  ? Math.floor(recentSessions.reduce((s, r) => s + (r.duration_sec ?? 0), 0) / recentSessions.length / 60)
                  : 0}
              </p>
              <p className="text-xs text-muted-foreground">{t('maStatsAvgMin')}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
