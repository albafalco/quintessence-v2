import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { MAGIA_FOKOZATOK } from '@/lib/magia-data';
import { ExerciseItem } from '@/components/magia/ExerciseItem';
import { StreakCalendar } from '@/components/magia/StreakCalendar';
import { PillarBalanceChart } from '@/components/magia/PillarBalance';
import {
  buildExerciseKey,
  computeHeatmap,
  computePillarBalance,
  computeStreak,
  getCurrentFokozatId,
  getExerciseProgress,
} from '@/lib/magia-utils';
import { getBudapestNow } from '@/lib/push-reminders';
import type { MagiaProgressRecord, SessionRecord } from '@/lib/magia-utils';

interface MaMagiaPageProps {
  params: Promise<{ locale: string }>;
}

export default async function MaMagiaPage({ params }: MaMagiaPageProps) {
  const { locale } = await params;
  const t = await getTranslations('magia');
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const budapestNow = getBudapestNow();
  const todayDate = budapestNow.date;

  const thirtyDaysAgo = new Date(Date.now() - 35 * 86400000).toISOString();

  const [{ data: progressData }, { data: sessionsData }] = await Promise.all([
    supabase
      .from('magia_progress')
      .select('fokozat, section, exercise_key, completed, notes, status, mastered_at, session_count')
      .eq('user_id', user.id),
    supabase
      .from('magia_sessions')
      .select('id, fokozat, section, exercise_key, started_at, duration_sec, completed')
      .eq('user_id', user.id)
      .gte('started_at', thirtyDaysAgo)
      .order('started_at', { ascending: false }),
  ]);

  const allProgress = (progressData ?? []) as MagiaProgressRecord[];
  const recentSessions = (sessionsData ?? []) as SessionRecord[];

  const currentFokozatId = getCurrentFokozatId(allProgress);
  const fokozat = MAGIA_FOKOZATOK.find((f) => f.id === currentFokozatId)!;

  const streak = computeStreak(recentSessions, todayDate);
  const heatmapData = computeHeatmap(recentSessions, 35);
  const pillarBalance = computePillarBalance(recentSessions);

  const todaySessions = recentSessions.filter((s) => s.started_at.startsWith(todayDate));
  const todayExerciseKeys = new Set(todaySessions.map((s) => s.exercise_key));

  // Napi terv: az aktuális fokozat nem uralt gyakorlatai
  const sections = ['szellem', 'lelek', 'test'] as const;
  type PlanExercise = {
    section: 'szellem' | 'lelek' | 'test';
    exercise: typeof fokozat.szellem.gyakorlatok[number];
    progress: ReturnType<typeof getExerciseProgress>;
    doneToday: boolean;
  };

  const planExercises: PlanExercise[] = [];

  for (const section of sections) {
    for (const exercise of fokozat[section].gyakorlatok) {
      const ep = getExerciseProgress(currentFokozatId, section, exercise.key, allProgress);
      if (ep.status === 'mastered') continue;

      const fullKey = buildExerciseKey(section, currentFokozatId, exercise.key);
      const doneToday = todayExerciseKeys.has(fullKey);

      // Twice_daily: kétszer jelenjen meg, de ne duplikálj ha mindkettő kész
      if (exercise.params?.frequency === 'twice_daily') {
        const todayCount = todaySessions.filter((s) => s.exercise_key === fullKey).length;
        planExercises.push({ section, exercise, progress: ep, doneToday: todayCount >= 1 });
        planExercises.push({ section, exercise, progress: ep, doneToday: todayCount >= 2 });
      } else {
        planExercises.push({ section, exercise, progress: ep, doneToday });
      }
    }
  }

  const pillarEmoji = { szellem: '🧠', lelek: '💎', test: '⚡' } as const;
  const sectionLabel = { szellem: t('szellem'), lelek: t('lelek'), test: t('test') } as const;

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header className="premium-card magia-surface p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">
              ✦ Mágia — Ma
            </p>
            <h1 className="font-display text-3xl font-bold text-gradient-gold">
              Napi gyakorlás
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Intl.DateTimeFormat('hu', { dateStyle: 'long' }).format(new Date(todayDate))}
              {' · '}
              {fokozat.rovidcim}
            </p>
          </div>
          {streak > 0 && (
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-accent/10 px-4 py-3 shadow-glow-gold">
              <span className="text-2xl">🔥</span>
              <span className="font-display text-xl font-bold text-accent">{streak}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-accent/70">nap</span>
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-3">
          <Link
            href={`/${locale}/modules/magia`}
            className="text-xs text-muted-foreground transition hover:text-accent"
          >
            ← Összes fokozat
          </Link>
          <Link
            href={`/${locale}/modules/magia/fokozat/${currentFokozatId}`}
            className="text-xs text-muted-foreground transition hover:text-accent"
          >
            {fokozat.rovidcim} részletek →
          </Link>
        </div>
      </header>

      {/* Napi terv */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent/70">
          <span className="h-px flex-1 bg-gradient-to-r from-accent/40 to-transparent" />
          Mai terv
          <span className="h-px flex-1 bg-gradient-to-l from-accent/40 to-transparent" />
        </h2>

        {planExercises.length === 0 ? (
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-display text-lg font-semibold text-cream">
              Minden gyakorlat uralt!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              A {fokozat.cim} összes gyakorlata uralt. Hamarosan feloldódik a következő fokozat.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {planExercises.map((item, idx) => {
              const isTwiceDaily = item.exercise.params?.frequency === 'twice_daily';
              const label = isTwiceDaily
                ? `${pillarEmoji[item.section]} ${sectionLabel[item.section]} — ${idx % 2 === 0 ? 'Reggel' : 'Este'}`
                : `${pillarEmoji[item.section]} ${sectionLabel[item.section]}`;

              return (
                <div key={`${item.exercise.key}-${idx}`} className={item.doneToday ? 'opacity-50' : ''}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    {label}
                    {item.doneToday && <span className="ml-2 text-accent/60">✓ Ma elvégezve</span>}
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
            Összesített statisztika — 35 nap
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-display text-2xl font-bold text-accent">{recentSessions.length}</p>
              <p className="text-xs text-muted-foreground">munkamenet</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-accent">
                {Math.floor(recentSessions.reduce((s, r) => s + (r.duration_sec ?? 0), 0) / 60)}
              </p>
              <p className="text-xs text-muted-foreground">perc összesen</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-accent">
                {recentSessions.length > 0
                  ? Math.floor(recentSessions.reduce((s, r) => s + (r.duration_sec ?? 0), 0) / recentSessions.length / 60)
                  : 0}
              </p>
              <p className="text-xs text-muted-foreground">perc átlag</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
