'use client';

import { useTranslations } from 'next-intl';
import type { ElementType, SoulMirrorItem, SoulMirrorType } from '@/lib/magia-types';
import { cn } from '@/lib/utils';
import {
  ELEMENT_COLORS,
  ELEMENT_LABEL_KEYS as LABEL_KEYS,
  ELEMENT_ORDER as ORDER,
  plainElementName as plainName,
} from '@/lib/elements';


export interface ElementStats {
  /** Sum of intensities (1–3) of unresolved items, per element */
  weights: Record<ElementType, number>;
  resolved: Record<ElementType, number>;
  total: number;
  unassigned: number;
}

export function computeElementStats(items: Pick<SoulMirrorItem, 'mirror' | 'element' | 'intensity' | 'resolved'>[], mirror: SoulMirrorType): ElementStats {
  const weights = { tuz: 0, levego: 0, viz: 0, fold: 0 };
  const resolved = { tuz: 0, levego: 0, viz: 0, fold: 0 };
  let unassigned = 0;
  for (const item of items) {
    if (item.mirror !== mirror) continue;
    if (!item.element) {
      if (!item.resolved) unassigned++;
      continue;
    }
    if (item.resolved) resolved[item.element]++;
    else weights[item.element] += item.intensity;
  }
  const total = ORDER.reduce((sum, el) => sum + weights[el], 0);
  return { weights, resolved, total, unassigned };
}

const CENTER = 32;
const RADIUS = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_DEG = 4;

function BalanceRing({ stats }: { stats: ElementStats }) {
  const present = ORDER.filter((el) => stats.weights[el] > 0);
  const gap = present.length > 1 ? GAP_DEG : 0;
  const usableDeg = 360 - gap * present.length;

  // Arc segments laid out clockwise from 12 o'clock
  const segments: { el: ElementType; length: number; rotate: number }[] = [];
  let cursor = -90;
  for (const el of present) {
    const deg = (stats.weights[el] / stats.total) * usableDeg;
    segments.push({ el, length: (CIRCUMFERENCE * deg) / 360, rotate: cursor });
    cursor += deg + gap;
  }

  return (
    <svg viewBox="0 0 64 64" className="h-24 w-24 shrink-0" aria-hidden>
      <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="currentColor" strokeWidth={6} className="text-muted/40" />
      {segments.map(({ el, length, rotate }) => (
        <circle
          key={el}
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={ELEMENT_COLORS[el]}
          strokeWidth={6}
          strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
          transform={`rotate(${rotate} ${CENTER} ${CENTER})`}
        />
      ))}
      <path
        d="M32 24.5 33.6 30.4 39.5 32 33.6 33.6 32 39.5 30.4 33.6 24.5 32 30.4 30.4Z"
        fill="#E8C96A"
        opacity={stats.total > 0 ? 1 : 0.35}
      />
    </svg>
  );
}

interface ElementBalanceProps {
  items: Pick<SoulMirrorItem, 'mirror' | 'element' | 'intensity' | 'resolved'>[];
  mirror: SoulMirrorType;
  className?: string;
}

export function ElementBalance({ items, mirror, className }: ElementBalanceProps) {
  const t = useTranslations('magia');
  const stats = computeElementStats(items, mirror);
  const name = (el: ElementType) => plainName(t(LABEL_KEYS[el]));
  const pct = (el: ElementType) => (stats.total > 0 ? Math.round((stats.weights[el] / stats.total) * 100) : 0);

  const sorted = [...ORDER].sort((a, b) => stats.weights[b] - stats.weights[a]);
  const dominant = sorted[0];
  const weakest = sorted[sorted.length - 1];

  // Hints only once there is enough data to be meaningful.
  let note: string | null = null;
  if (stats.total >= 4) {
    const missing = ORDER.find((el) => stats.weights[el] === 0);
    if (pct(dominant) >= 45) note = t('elementImbalanceHigh', { element: name(dominant) });
    else if (missing) note = t('elementImbalanceMissing', { element: name(missing) });
  }

  return (
    <div className={cn('rounded-2xl border border-border/40 bg-card/30 p-4', className)}>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">
        {t('elementBalanceTitle')}
      </p>

      {stats.total === 0 ? (
        <p className="text-sm text-muted-foreground">{t('elementNoData')}</p>
      ) : (
        <div className="flex items-center gap-4">
          <BalanceRing stats={stats} />
          <ul className="min-w-0 flex-1 space-y-1.5">
            {ORDER.map((el) => (
              <li key={el} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ELEMENT_COLORS[el] }} />
                <span className="flex-1 truncate text-cream/90">{name(el)}</span>
                <span className="tabular-nums text-cream">{pct(el)}%</span>
                {stats.resolved[el] > 0 && (
                  <span className="tabular-nums text-[10px] text-green-400/80" title={t('elementResolvedTitle')}>
                    ✓{stats.resolved[el]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.total > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t('elementDominant', { element: name(dominant), pct: pct(dominant) })}
          {' · '}
          {t('elementWeakest', { element: name(weakest), pct: pct(weakest) })}
        </p>
      )}
      {stats.unassigned > 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground/70">{t('elementUnassigned', { count: stats.unassigned })}</p>
      )}
      {note && (
        <p className="mt-3 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-xs text-accent/90">✦ {note}</p>
      )}
    </div>
  );
}
