'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { BADGES, type BadgeCategory } from '@/lib/badges';
import { syncBadges, type BadgeState } from '@/lib/badges-sync';
import { BadgeToast } from '@/components/ui/BadgeToast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapse } from '@/components/ui/collapse';
import { cn } from '@/lib/utils';

/** Gap kept between the tooltip and the edge of its boundary (px). */
const TOOLTIP_EDGE_GAP = 8;

interface BadgeChipProps {
  icon: string;
  title: string;
  description: string;
  earnedText: string;
  /** The tooltip is shifted sideways to stay inside this element */
  boundaryRef: React.RefObject<HTMLElement | null>;
}

/** Small earned-badge icon; hover (mouse), keyboard focus or tap shows why it was earned. */
function BadgeChip({ icon, title, description, earnedText, boundaryRef }: BadgeChipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const lastPointer = useRef<string>('mouse');
  const tipId = useId();

  // Centre the tooltip over the icon, then nudge it back inside the card
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const arrow = arrowRef.current;
    const boundary = boundaryRef.current;
    if (!open || !tip || !arrow) return;
    tip.style.marginLeft = '0px';
    arrow.style.marginLeft = '0px';
    if (!boundary) return;
    const rect = tip.getBoundingClientRect();
    const bounds = boundary.getBoundingClientRect();
    let shift = 0;
    if (rect.left < bounds.left + TOOLTIP_EDGE_GAP) shift = bounds.left + TOOLTIP_EDGE_GAP - rect.left;
    else if (rect.right > bounds.right - TOOLTIP_EDGE_GAP) shift = bounds.right - TOOLTIP_EDGE_GAP - rect.right;
    tip.style.marginLeft = `${shift}px`;
    arrow.style.marginLeft = `${-shift}px`;
  }, [open, boundaryRef]);

  // Touch: a tap anywhere else closes it; Esc closes it everywhere
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={title}
        aria-describedby={open ? tipId : undefined}
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType;
        }}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && setOpen(true)}
        onBlur={() => setOpen(false)}
        // With a mouse, hover already opened it — a click must not close it again
        onClick={() => setOpen((v) => (lastPointer.current === 'mouse' ? true : !v))}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-light to-accent-dark text-base shadow-glow-gold transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
          open && 'scale-110'
        )}
      >
        {icon}
      </button>
      {open && (
        <span
          ref={tipRef}
          id={tipId}
          role="tooltip"
          className="absolute bottom-full left-[calc(50%-6.5rem)] z-30 mb-2.5 block w-52 animate-pop-in rounded-xl border border-accent/30 bg-card-elevated/95 px-3 py-2.5 text-left shadow-card backdrop-blur motion-reduce:animate-none"
        >
          <span className="block text-sm font-semibold text-cream">{title}</span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{description}</span>
          <span className="mt-1.5 block text-[11px] font-medium text-accent">✦ {earnedText}</span>
          <span
            ref={arrowRef}
            aria-hidden
            className="absolute left-[calc(50%-5px)] top-full block h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-r border-accent/30 bg-card-elevated"
          />
        </span>
      )}
    </span>
  );
}

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
                    <BadgeChip
                      key={b.id}
                      icon={b.icon}
                      title={t(`${b.id}.title`)}
                      description={t(`${b.id}.desc`)}
                      earnedText={state.earned[b.id] ? t('earnedOn', { date: formatDate(state.earned[b.id]!) }) : t('earned')}
                      boundaryRef={contentRef}
                    />
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
