'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { loadTodayData } from '@/lib/today';
import type { Locale } from '@/i18n';
import { cn } from '@/lib/utils';

interface Momentum {
  streak: number;
  done: number;
  total: number;
}

const RING_R = 7;
const RING_C = 2 * Math.PI * RING_R;
/** Gap between the tooltip and the screen edge (px) */
const EDGE_GAP = 8;

/**
 * Desktop header: streak + today's Fehér Mágia plan, linking to the "Ma" page.
 */
export function MomentumChip() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const pathname = usePathname();
  const [momentum, setMomentum] = useState<Momentum | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  // Under the chip, kept on screen (fixed: the header's overflow would clip it)
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const link = linkRef.current;
    const arrow = arrowRef.current;
    if (!tipOpen || !tip || !link || !arrow) return;
    const rect = link.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const left = Math.min(Math.max(EDGE_GAP, center - tip.offsetWidth / 2), window.innerWidth - EDGE_GAP - tip.offsetWidth);
    tip.style.top = `${rect.bottom + 10}px`;
    tip.style.left = `${left}px`;
    arrow.style.left = `${center - left - 5}px`;
  }, [tipOpen]);

  // Re-read on every page change, so a finished session shows up right away
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: progress } = await supabase
        .from('magia_progress')
        .select('fokozat, section, exercise_key, completed, completed_at, notes, status, mastered_at, session_count')
        .eq('user_id', user.id);
      const today = await loadTodayData(supabase, user.id, locale as Locale, progress ?? [], false);
      if (cancelled) return;
      setMomentum({ streak: today.streak, done: today.items.filter((i) => i.done).length, total: today.items.length });
    })().catch((err) => console.error('[momentum] load failed', err));
    return () => {
      cancelled = true;
    };
  }, [pathname, locale]);

  if (!momentum) return null;

  const { streak, done, total } = momentum;
  const allDone = total > 0 && done === total;
  const label = t('momentumLabel', { streak, done, total });

  return (
    <Link
      ref={linkRef}
      href={`/${locale}/modules/magia/ma`}
      aria-label={label}
      aria-describedby={tipOpen ? tipId : undefined}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setTipOpen(true)}
      onPointerLeave={() => setTipOpen(false)}
      onFocus={(e) => e.currentTarget.matches(':focus-visible') && setTipOpen(true)}
      onBlur={() => setTipOpen(false)}
      onClick={() => setTipOpen(false)}
      className="hidden h-9 shrink-0 items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-3 text-sm font-semibold transition-all hover:border-accent/30 hover:bg-muted/50 md:flex"
    >
      <span className={cn('flex items-center gap-1', streak > 0 ? 'text-accent' : 'text-muted-foreground')}>
        <Flame className="h-4 w-4" />
        {streak}
      </span>
      {total > 0 && (
        <>
          <span className="h-4 w-px bg-border/60" />
          <span className={cn('flex items-center gap-1.5', allDone ? 'text-accent' : 'text-cream/90')}>
            <svg viewBox="0 0 18 18" className="h-4 w-4 -rotate-90" aria-hidden>
              <circle cx="9" cy="9" r={RING_R} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground/25" />
              {done > 0 && (
                <circle
                  cx="9"
                  cy="9"
                  r={RING_R}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={`${(RING_C * done) / total} ${RING_C}`}
                  className="text-accent transition-all duration-700"
                />
              )}
            </svg>
            <span className="tabular-nums">
              {done}/{total}
            </span>
          </span>
        </>
      )}
      {tipOpen &&
        createPortal(
          <div
            ref={tipRef}
            id={tipId}
            role="tooltip"
            className="pointer-events-none fixed z-50 w-56 animate-pop-in rounded-xl border border-accent/30 bg-card-elevated/95 px-3 py-2.5 text-left shadow-card backdrop-blur motion-reduce:animate-none"
          >
            <span
              ref={arrowRef}
              aria-hidden
              className="absolute bottom-full block h-2.5 w-2.5 translate-y-1/2 rotate-45 border-l border-t border-accent/30 bg-card-elevated"
            />
            <dl className="space-y-1 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t('momentumStreak')}</dt>
                <dd className="font-semibold text-cream">{t('momentumStreakValue', { count: streak })}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t('momentumToday')}</dt>
                <dd className="font-semibold tabular-nums text-cream">
                  {done} / {total}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] font-medium text-accent">✦ {t('momentumHint')}</p>
          </div>,
          document.body
        )}
    </Link>
  );
}
