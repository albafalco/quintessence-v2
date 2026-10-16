'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { BADGES, type BadgeCategory } from '@/lib/badges';
import { syncBadges, type BadgeState } from '@/lib/badges-sync';
import { BadgeToast } from '@/components/ui/BadgeToast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapse } from '@/components/ui/collapse';
import { InfoTip } from '@/components/ui/info-tip';
import { cn } from '@/lib/utils';

export function BadgesSection({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const t = useTranslations('badges');
  const locale = useLocale();
  const contentRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<BadgeState | null>(null);
  // Compact mode starts as a one-line summary; the full grid opens on demand
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    let cancelled = false;
    syncBadges(createClient(), userId)
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch((err) => console.error('[badges] sync failed', err));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Kreatív Angol is only available on the Hungarian UI
  const categories: BadgeCategory[] = locale === 'hu' ? ['magia', 'angol'] : ['magia'];
  const formatDate = (iso: string) => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));
  const earnedCount = state ? BADGES.filter((b) => categories.includes(b.category) && b.id in state.earned).length : 0;
  const totalCount = BADGES.filter((b) => categories.includes(b.category)).length;

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-3 text-gradient-gold">
          <span>{t('sectionTitle')}</span>
          {state && <span className="text-sm font-medium text-muted-foreground">{earnedCount} / {totalCount}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent ref={contentRef}>
        {!state ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : (
          <>
            {compact && (
              <Collapse open={!expanded}>
                <div className="flex flex-wrap items-center gap-2">
                  {BADGES.filter((b) => categories.includes(b.category) && b.id in state.earned).map((b) => (
                    <InfoTip
                      key={b.id}
                      label={t(`${b.id}.title`)}
                      title={t(`${b.id}.title`)}
                      description={t(`${b.id}.desc`)}
                      footer={state.earned[b.id] ? t('earnedOn', { date: formatDate(state.earned[b.id]!) }) : t('earned')}
                      boundaryRef={contentRef}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-light to-accent-dark text-base shadow-glow-gold transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                      openClassName="scale-110"
                    >
                      {b.icon}
                    </InfoTip>
                  ))}
                  {earnedCount === 0 && <p className="text-sm text-muted-foreground">{t('noneYet')}</p>}
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    aria-expanded={false}
                    className="ml-auto text-sm font-medium text-accent hover:underline"
                  >
                    {t('showAll')} ▸
                  </button>
                </div>
              </Collapse>
            )}
            <Collapse open={expanded} className="space-y-6">
              {categories.map((category, ci) => (
                <div key={category} className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t(`category_${category}`)}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {BADGES.filter((b) => b.category === category).map((badge, bi) => {
                      const earnedAt = state.earned[badge.id];
                      const earned = badge.id in state.earned;
                      const { value, target } = badge.progress(state.stats);
                      // Tiles drift in one after another each time the grid opens
                      const order = ci * 8 + bi;
                      return (
                        <div
                          key={badge.id}
                          style={expanded ? { animationDelay: `${80 + order * 35}ms` } : undefined}
                          className={cn(
                            'flex flex-col items-center rounded-2xl border p-3 text-center transition',
                            earned ? 'border-accent/40 bg-accent/5 shadow-glow-gold' : 'border-border/40 bg-card/20',
                            expanded && 'animate-fade-up motion-reduce:animate-none'
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-12 w-12 items-center justify-center rounded-full text-xl',
                              earned ? 'bg-gradient-to-br from-accent-light to-accent-dark' : 'bg-muted/40 opacity-40 grayscale'
                            )}
                          >
                            {badge.icon}
                          </span>
                          <p className={cn('mt-2 text-xs font-semibold', earned ? 'text-cream' : 'text-muted-foreground')}>
                            {t(`${badge.id}.title`)}
                          </p>
                          {earned ? (
                            <p className="mt-0.5 text-[10px] text-accent/80">{earnedAt ? t('earnedOn', { date: formatDate(earnedAt) }) : t('earned')}</p>
                          ) : (
                            <>
                              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground/80">{t(`${badge.id}.desc`)}</p>
                              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/50">
                                <div className="h-full rounded-full bg-accent/60" style={{ width: `${Math.min(100, (value / target) * 100)}%` }} />
                              </div>
                              <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">{Math.min(value, target)} / {target}</p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {compact && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-expanded
                  className="text-sm font-medium text-accent hover:underline"
                >
                  ▴ {t('showLess')}
                </button>
              )}
            </Collapse>
          </>
        )}
      </CardContent>
      {state && state.newlyEarned.length > 0 && <BadgeToast badgeIds={state.newlyEarned} />}
    </Card>
  );
}
