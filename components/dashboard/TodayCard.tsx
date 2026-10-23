'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Check, ChevronRight } from 'lucide-react';
import type { TodayData } from '@/lib/today';
import { ElementsNavIcon } from '@/components/ui/ElementsIcon';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/AppIcon';

const MAX_MAGIA_ROWS = 5;

interface TodayCardProps {
  today: TodayData;
  /** null when the review schedule is not available or Kreatív Angol is hidden */
  angolReviewCount: number | null;
  showAngol: boolean;
}

function TaskRow({ href, done, children }: { href: string; done: boolean; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-muted/30">
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
            done ? 'border-accent bg-accent text-accent-foreground' : 'border-muted-foreground/40'
          )}
        >
          {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
        <span className={cn('min-w-0 flex-1 truncate text-sm', done ? 'text-muted-foreground line-through' : 'text-cream')}>
          {children}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:text-accent" />
      </Link>
    </li>
  );
}

export function TodayCard({ today, angolReviewCount, showAngol }: TodayCardProps) {
  const t = useTranslations('dashboard');
  const tNav = useTranslations('nav');
  const tPath = useTranslations('feherMagia');
  const locale = useLocale();

  const hasAngolTask = showAngol && angolReviewCount !== null;
  const total = today.items.length + (hasAngolTask ? 1 : 0);
  const done = today.items.filter((i) => i.done).length + (hasAngolTask && angolReviewCount === 0 ? 1 : 0);
  const allDone = total > 0 && done === total;
  const visible = today.items.slice(0, MAX_MAGIA_ROWS);
  const hidden = today.items.length - visible.length;
  const magiaHref = `/${locale}/modules/magia/ma`;
  // A quick note during the day, once the Gate is read
  const canNote = !today.items.some((i) => i.task === 'gate');

  return (
    <section className="premium-card p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-cream">{t('todayTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('todayProgress', { done, total })}</p>
        </div>
        {today.streak > 0 && (
          <span className="inline-flex items-center gap-1 rounded-xl bg-accent/10 px-3 py-1 text-sm font-bold text-accent shadow-glow-gold">
            <AppIcon name="flame" className="h-4 w-4" />
            {today.streak}
          </span>
        )}
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-dark via-accent to-accent-light transition-all duration-700"
          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
        />
      </div>

      {allDone && (
        <p className="mt-4 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2.5 text-center text-sm text-accent">
          ✦ {t('todayAllDone')}
        </p>
      )}

      {today.items.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between gap-2 px-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">
              <ElementsNavIcon className="h-3 w-3" />
              {tNav('magia')}
            </p>
            {canNote && (
              <Link
                href={`${magiaHref}?jegyzet=1`}
                className="rounded-lg border border-accent/30 px-2 py-0.5 text-xs font-semibold text-accent transition hover:bg-accent/10"
              >
                {tPath('dashboard.note')}
              </Link>
            )}
          </div>
          <ul>
            {visible.map((item, i) => (
              <TaskRow key={i} href={item.task === 'gate' ? `/${locale}/modules/magia/kapu` : magiaHref} done={item.done}>
                {item.task === 'gate' ? tPath('dashboard.gate') : tPath(`items.${item.task}`)}
                {item.part && <span className="ml-1.5 text-xs text-muted-foreground">· {tPath(`dashboard.parts.${item.part}`)}</span>}
              </TaskRow>
            ))}
          </ul>
          {hidden > 0 && (
            <Link href={magiaHref} className="block px-2 pt-1 text-xs text-muted-foreground hover:text-accent">
              {t('todayMore', { count: hidden })}
            </Link>
          )}
        </div>
      )}

      {showAngol && (hasAngolTask || today.hardCount > 0) && (
        <div className="mt-3">
          <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('angolLabel')}</p>
          <ul>
            {hasAngolTask && (
              <TaskRow href={`/${locale}/modules/angol/lecke/1/szakasz/0`} done={angolReviewCount === 0}>
                <AppIcon name="repeat" className="mr-1.5 h-3.5 w-3.5 align-[-2px]" />
                {t('todayReview', { count: angolReviewCount ?? 0 })}
              </TaskRow>
            )}
            {today.hardCount > 0 && (
              <li>
                <Link
                  href={`/${locale}/modules/angol/lecke/1/nehez`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-amber-200/90 transition hover:bg-muted/30"
                >
                  <span className="flex w-5 justify-center">
                    <AppIcon name="alert" className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{t('todayHard', { count: today.hardCount })}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      {today.path.cycleReady && (
        <Link
          href={`/${locale}/modules/magia/tukor`}
          className="mt-3 flex items-center justify-between rounded-xl border border-accent/25 px-3 py-2.5 text-sm text-accent transition hover:bg-accent/10"
        >
          {tPath('dashboard.cycleReady')}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}

    </section>
  );
}
