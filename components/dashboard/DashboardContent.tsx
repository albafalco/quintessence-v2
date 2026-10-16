'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { bootLog } from '@/lib/boot-logger';

import {
  formatActivityDate,
  getAngolDashboardStats,
  getMagiaDashboardStats,
} from '@/lib/dashboard';
import { cn, formatDate } from '@/lib/utils';
import { isMissingColumnError } from '@/lib/supabase/missing-column';
import { countReviewQueue, type CardScheduleRow } from '@/lib/angol-srs';
import { toBudapestDate } from '@/lib/push-reminders';
import vocabulary from '@/messages/content/angol-vocabulary.json';

const VOCABULARY_SIZE = (vocabulary as unknown[]).length;
import { ShieldLogo } from '@/components/ui/ShieldLogo';
import { FlagIcon } from '@/components/ui/FlagIcon';
import { ElementsIcon, ElementsNavIcon } from '@/components/ui/ElementsIcon';
import { ModuleCard } from '@/components/dashboard/ModuleCard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { TodayCard } from '@/components/dashboard/TodayCard';
import { loadTodayData, type TodayData } from '@/lib/today';
import { syncBadges } from '@/lib/badges-sync';
import { emitNotificationsChanged } from '@/lib/notifications';
import type { Locale } from '@/i18n';

const FETCH_TIMEOUT_MS = 8000;

function timed<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

interface DashboardData {
  username: string;
  showAngol: boolean;
  magiaStats: ReturnType<typeof getMagiaDashboardStats>;
  angolStats: { progress: number; lastActivity: string | null; reviewCount: number | null };
  today: TodayData | null;
}

export function DashboardContent() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('dashboard');
  const tModules = useTranslations('modules');
  const tBrand = useTranslations('brand');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bootLog('dashboard-fetch-start');

    async function load() {
      try {
        const supabase = createClient();
        // getSession() reads the (middleware-refreshed) cookie locally — no network
        // round trip on cold start. Data access is still enforced by RLS.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;
        if (!user) {
          bootLog('dashboard-no-user-redirect');
          router.replace(`/${locale}/auth/login`);
          return;
        }

        const profileResult = await timed(
          supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single(),
          FETCH_TIMEOUT_MS,
          { data: null, error: null } as never
        );

        const username = profileResult.data?.username ?? 'user';
        // Same rule as the menus and the middleware: Kreatív Angol is only
        // available on the Hungarian UI.
        const showAngol = locale === 'hu';

        const magiaResult = await timed(
          supabase
            .from('magia_progress')
            .select('fokozat, section, exercise_key, completed, completed_at, notes, status, mastered_at, session_count')
            .eq('user_id', user.id),
          FETCH_TIMEOUT_MS,
          { data: [], error: null } as never
        );

        const magiaStats = getMagiaDashboardStats(magiaResult.data ?? []);
        // Not critical: the card is simply left out if this fails
        const todayPromise = loadTodayData(supabase, user.id, locale as Locale, magiaResult.data ?? [], showAngol).catch(
          (err) => {
            bootLog('dashboard-today-failed', { error: String(err) });
            return null;
          }
        );

        let angolStats = { progress: 0, lastActivity: null as string | null, reviewCount: null as number | null };
        if (showAngol) {
          const [cardResult, unlockResult] = await Promise.all([
            timed(
              supabase
                .from('angol_card_progress')
                .select('correct_count, last_seen, word_hu, due_on, introduced_on')
                .eq('user_id', user.id),
              FETCH_TIMEOUT_MS,
              { data: [], error: null } as never
            ),
            timed(
              supabase
                .from('angol_section_unlocks')
                .select('section_id, unlocked_at')
                .eq('user_id', user.id)
                .eq('lesson_id', 1),
              FETCH_TIMEOUT_MS,
              { data: [], error: null } as never
            ),
          ]);
          let cards = cardResult.data;
          // due_on / introduced_on come from migration 009 — retry without them before that
          let hasSchedule = true;
          if (isMissingColumnError(cardResult.error)) {
            hasSchedule = false;
            const fallback = await supabase
              .from('angol_card_progress')
              .select('correct_count, last_seen')
              .eq('user_id', user.id);
            cards = fallback.data as typeof cards;
          }
          angolStats = {
            ...getAngolDashboardStats(cards ?? [], unlockResult.data ?? []),
            reviewCount: hasSchedule
              ? countReviewQueue(VOCABULARY_SIZE, (cards ?? []) as CardScheduleRow[], toBudapestDate(new Date()))
              : null,
          };
        }

        const today = await todayPromise;
        if (cancelled) return;

        bootLog('dashboard-fetch-done');
        setData({ username, showAngol, magiaStats, angolStats, today });

        // Milestones are checked in the background; new ones show up in the bell
        syncBadges(supabase, user.id)
          .then((state) => {
            if (state.newlyEarned.length > 0) emitNotificationsChanged();
          })
          .catch((err) => bootLog('badges-sync-failed', { error: String(err) }));
        setLoading(false);
      } catch (err) {
        bootLog('dashboard-fetch-failed', { error: String(err) });
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [locale, router]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">{t('loadError')}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  const { username, showAngol, magiaStats, angolStats, today: todayData } = data;
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
            <p className="text-muted-foreground">
              {t('date')}: {today}
            </p>
          </div>
          <div className={cn('grid grid-cols-1 gap-3', showAngol && 'min-[400px]:grid-cols-2')}>
            <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-accent">
                <ElementsNavIcon className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {t('magiaLabel')}
                </span>
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
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    {t('angolLabel')}
                  </span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-cream">
                  {angolStats.progress}%
                </p>
                <p className="text-xs text-muted-foreground">{t('lesson1Progress')}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {todayData && <TodayCard today={todayData} angolReviewCount={showAngol ? angolStats.reviewCount : null} showAngol={showAngol} />}

      <section>
        <h2 className="mb-5 font-display text-xl font-semibold text-cream">{t('continue')}</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <ModuleCard
            title={tModules('magia.title')}
            subtitle={tModules('magia.subtitle')}
            href={`/${locale}/modules/magia`}
            progress={magiaStats.fokozatPercent}
            progressLabel={t('fokozat', { level: magiaStats.currentFokozat })}
            lastActivity={formatActivityDate(magiaStats.lastActivity, locale)}
            icon={<ElementsIcon className="h-8 w-8" />}
            variant="magia"
          />

          {showAngol && (
            <ModuleCard
              title={tModules('angol.title')}
              subtitle={tModules('angol.subtitle')}
              href={`/${locale}/modules/angol`}
              progress={angolStats.progress}
              note={angolStats.reviewCount ? t('reviewDue', { count: angolStats.reviewCount }) : undefined}
              progressLabel={t('lesson1Progress')}
              lastActivity={formatActivityDate(angolStats.lastActivity, locale)}
              icon={<FlagIcon locale="en" className="h-5 w-7" />}
              variant="angol"
            />
          )}
        </div>
      </section>
    </div>
  );
}