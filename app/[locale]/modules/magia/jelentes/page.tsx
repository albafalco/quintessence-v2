import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { loadMagiaFokozatok } from '@/lib/magia-data';
import { getBudapestNow } from '@/lib/push-reminders';
import { addDays, buildExerciseTitles, loadWeeklyReport, weekStartOf } from '@/lib/weekly-report';
import { formatDurationLabel } from '@/lib/magia-utils';
import { PillarBalanceChart } from '@/components/magia/PillarBalance';
import { ELEMENT_COLORS, ELEMENT_LABEL_KEYS, plainElementName } from '@/lib/elements';
import type { ElementType } from '@/lib/magia-types';
import type { Locale } from '@/i18n';

interface ReportPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ het?: string }>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/40 bg-card/20 p-5">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-accent/70">{title}</h3>
      {children}
    </section>
  );
}

export default async function WeeklyReportPage({ params, searchParams }: ReportPageProps) {
  const { locale } = await params;
  const { het } = await searchParams;
  const t = await getTranslations('magia');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const today = getBudapestNow().date;
  const currentMonday = weekStartOf(today);
  const requested = het && /^\d{4}-\d{2}-\d{2}$/.test(het) ? weekStartOf(het) : currentMonday;
  const monday = requested > currentMonday ? currentMonday : requested;

  const fokozatok = await loadMagiaFokozatok(locale as Locale);
  const report = await loadWeeklyReport(supabase, user.id, monday, today, buildExerciseTitles(fokozatok));

  const range = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', timeZone: 'UTC' }).formatRange(
    new Date(report.monday + 'T00:00:00Z'),
    new Date(report.sunday + 'T00:00:00Z')
  );
  const dayLabels = ['calendarDayH', 'calendarDayK', 'calendarDaySz', 'calendarDayCs', 'calendarDayP', 'calendarDaySzo', 'calendarDayV'].map((k) => t(k));
  const diffPct = report.prevMinutes > 0 ? Math.round(((report.totalMinutes - report.prevMinutes) / report.prevMinutes) * 100) : null;
  const isCurrentWeek = monday === currentMonday;
  const isEmpty = report.sessionCount === 0;
  const formatPlanDate = (date: string) =>
    new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'));
  const plainElement = (el: ElementType) => plainElementName(t(ELEMENT_LABEL_KEYS[el]));

  const navClass = 'flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-muted/30 transition hover:border-accent/40 hover:text-accent';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="premium-card magia-surface p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t('reportBadge')}</p>
        <h1 className="font-display text-2xl font-bold text-gradient-gold sm:text-3xl">{t('reportTitle')}</h1>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Link href={`/${locale}/modules/magia/jelentes?het=${addDays(monday, -7)}`} className={navClass} aria-label={t('reportPrevWeek')}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <p className="text-center text-sm font-semibold text-cream">
            {range}
            {isCurrentWeek && <span className="block text-[11px] font-normal text-muted-foreground">{t('reportCurrentWeek')}</span>}
          </p>
          {isCurrentWeek ? (
            <span className={`${navClass} pointer-events-none opacity-30`} aria-hidden>
              <ChevronRight className="h-5 w-5" />
            </span>
          ) : (
            <Link href={`/${locale}/modules/magia/jelentes?het=${addDays(monday, 7)}`} className={navClass} aria-label={t('reportNextWeek')}>
              <ChevronRight className="h-5 w-5" />
            </Link>
          )}
        </div>
        <div className="mt-3 flex gap-3">
          <Link href={`/${locale}/modules/magia`} className="text-xs text-muted-foreground transition hover:text-accent">{t('maBackToAll')}</Link>
          <Link href={`/${locale}/modules/magia/ma`} className="text-xs text-muted-foreground transition hover:text-accent">{t('dailyPracticeButton')}</Link>
        </div>
      </header>

      {isEmpty && (
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5 text-center text-sm text-cream/90">{t('reportEmptyWeek')}</div>
      )}

      {/* 1. Összesítés */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/40 bg-card/20 p-4 text-center">
          <p className="font-display text-3xl font-bold text-accent">{report.totalMinutes}</p>
          <p className="text-xs text-muted-foreground">{t('reportMinutes')}</p>
          {diffPct !== null && (
            <p className={`mt-1 text-[11px] font-semibold ${diffPct >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
              {diffPct >= 0 ? '↑' : '↓'} {Math.abs(diffPct)}% {t('reportVsPrev')}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/20 p-4 text-center">
          <p className="font-display text-3xl font-bold text-accent">{report.sessionCount}</p>
          <p className="text-xs text-muted-foreground">{t('reportSessions')}</p>
        </div>
      </div>

      {/* 2. Aktív napok + sorozat */}
      <Card title={t('reportActiveDays')}>
        <div className="grid grid-cols-7 gap-2 text-center">
          {report.activeDays.map((active, i) => (
            <div key={i} className="space-y-1.5">
              <div
                className={`mx-auto h-8 w-8 rounded-full border ${
                  active ? 'border-accent bg-accent/80 shadow-glow-gold' : 'border-border/50 bg-muted/20'
                }`}
              />
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">{dayLabels[i]}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-cream/90">
          🔥 {t('reportStreak', { count: report.streak })}
        </p>
      </Card>

      {/* 3. Pillér-egyensúly */}
      <PillarBalanceChart balance={report.pillars} title={t('reportPillars')} />

      {/* 4. Legjobb munkamenet */}
      <Card title={t('reportBestSession')}>
        {report.best ? (
          <div className="space-y-1.5">
            <p className="font-display text-lg font-semibold text-cream">{report.best.title}</p>
            <p className="text-sm text-accent">
              {'★'.repeat(report.best.rating)}
              <span className="text-muted-foreground/40">{'★'.repeat(5 - report.best.rating)}</span>
              {report.best.durationSec > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">{formatDurationLabel(report.best.durationSec, t)}</span>
              )}
            </p>
            {report.best.note && <p className="line-clamp-3 text-sm italic text-cream/75">„{report.best.note}”</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('reportNoRatedSession')}</p>
        )}
      </Card>

      {/* 5. Fejlődés */}
      <Card title={t('reportProgress')}>
        {report.progressed.length === 0 && report.mastered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('reportNoProgress')}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {report.mastered.map((title) => (
              <li key={`m-${title}`} className="flex items-center gap-2 text-accent">
                <span>★</span>
                <span>{t('reportMastered', { title })}</span>
              </li>
            ))}
            {report.progressed.slice(0, 6).map((p) => (
              <li key={p.title} className="flex items-center justify-between gap-3 text-cream/90">
                <span className="truncate">{p.title}</span>
                <span className="shrink-0 text-xs text-accent/80">{t('reportSessionsCount', { count: p.count })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 6. Napló */}
      <Card title={t('reportJournal')}>
        <p className="text-sm text-cream/90">{t('reportJournalEntries', { count: report.journalCount })}</p>
        <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{t('reportNextPlans')}</p>
        {report.nextPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('reportNoPlans')}</p>
        ) : (
          <ul className="space-y-2">
            {report.nextPlans.map((plan, i) => (
              <li key={i} className="rounded-xl border border-border/30 bg-background/30 px-3 py-2 text-sm text-cream/90">
                <span className="mr-2 text-[11px] text-accent/70">{formatPlanDate(plan.date)}</span>
                {plan.text}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 7. Lelki tükör */}
      {report.resolvedByElement && (
        <Card title={t('reportSoulMirror')}>
          {(() => {
            const total = Object.values(report.resolvedByElement).reduce((a, b) => a + b, 0);
            if (total === 0) return <p className="text-sm text-muted-foreground">{t('reportNoResolved')}</p>;
            return (
              <div className="space-y-2">
                <p className="text-sm text-cream/90">{t('reportResolved', { count: total })}</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(report.resolvedByElement) as ElementType[])
                    .filter((el) => report.resolvedByElement![el] > 0)
                    .map((el) => (
                      <span
                        key={el}
                        className="rounded-lg px-2 py-1 text-xs font-semibold"
                        style={{ color: ELEMENT_COLORS[el], background: `${ELEMENT_COLORS[el]}1f` }}
                      >
                        {plainElement(el)} · {report.resolvedByElement![el]}
                      </span>
                    ))}
                </div>
              </div>
            );
          })()}
        </Card>
      )}
    </div>
  );
}
