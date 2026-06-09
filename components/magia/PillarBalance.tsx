'use client';

import { useTranslations } from 'next-intl';
import type { PillarBalance } from '@/lib/magia-utils';

interface PillarBalanceProps {
  balance: PillarBalance;
}

function formatMin(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m} perc`;
}

export function PillarBalanceChart({ balance }: PillarBalanceProps) {
  const t = useTranslations('magia');
  const total = balance.totalSec;

  const PILLAR_CONFIG = [
    { key: 'szellem' as const, label: t('pillarSzellem'), color: '#818cf8', emoji: '🧠' },
    { key: 'lelek' as const, label: t('pillarLelek'), color: '#f9a8d4', emoji: '💎' },
    { key: 'test' as const, label: t('pillarTest'), color: '#4ade80', emoji: '⚡' },
  ];

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/20 p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-accent/70">
          {t('pillarTitle')}
        </h3>
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('pillarNoData')}
        </p>
      </div>
    );
  }

  const pillars = PILLAR_CONFIG.map((p) => ({
    ...p,
    sec: balance[p.key],
    pct: total > 0 ? Math.round((balance[p.key] / total) * 100) : 0,
  }));

  const neglected = pillars.filter((p) => p.pct < 20 && p.sec < total * 0.2);

  return (
    <div className="rounded-2xl border border-border/40 bg-card/20 p-5 space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-accent/70">
        {t('pillarTitleRecent')}
      </h3>

      <div className="space-y-3">
        {pillars.map((p) => (
          <div key={p.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-cream">
                <span>{p.emoji}</span>
                {p.label}
              </span>
              <span className="text-muted-foreground">
                {formatMin(p.sec)} <span className="text-accent/60">({p.pct}%)</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${p.pct}%`,
                  backgroundColor: p.color,
                  boxShadow: `0 0 8px ${p.color}60`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {neglected.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
          <p className="text-xs text-amber-400">
            ⚠ {t('pillarNeglectedWarning', { names: neglected.map((p) => p.label).join(', ') })}
          </p>
        </div>
      )}
    </div>
  );
}
