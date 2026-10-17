'use client';

import { useEffect, useState } from 'react';
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

/**
 * Desktop header: streak + today's Fehér Mágia plan, linking to the "Ma" page.
 * Hidden on the dashboard, where the Today card shows the same.
 */
export function MomentumChip() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const pathname = usePathname();
  const [momentum, setMomentum] = useState<Momentum | null>(null);
  const onDashboard = pathname === `/${locale}` || pathname === `/${locale}/`;

  // Re-read on every page change, so a finished session shows up right away
  useEffect(() => {
    if (onDashboard) return;
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
  }, [pathname, locale, onDashboard]);

  if (onDashboard || !momentum) return null;

  const { streak, done, total } = momentum;
  const allDone = total > 0 && done === total;
  const label = t('momentumLabel', { streak, done, total });

  return (
    <Link
      href={`/${locale}/modules/magia/ma`}
      title={label}
      aria-label={label}
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
    </Link>
  );
}
