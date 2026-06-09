'use client';

import type { PillarBalance } from '@/lib/magia-utils';

interface PillarBalanceProps {
  balance: PillarBalance;
}

function formatMin(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m} perc`;
}

const PILLAR_CONFIG = [
  { key: 'szellem' as const, label: 'Szellem', color: '#818cf8', emoji: '🧠' },
  { key: 'lelek' as const, label: 'Lélek', color: '#f9a8d4', emoji: '💎' },
  { key: 'test' as const, label: 'Test', color: '#4ade80', emoji: '⚡' },
] as const;

export function PillarBalanceChart({ balance }: PillarBalanceProps) {
  const total = balance.totalSec;

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/20 p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-accent/70">
          Pillér-egyensúly
        </h3>
        <p className="text-sm text-muted-foreground text-center py-4">
          Még nincs elegendő munkamenet-adat.
        </p>
      </div>
    );
  }

  const pillars = PILLAR_CONFIG.map((p) => ({
    ...p,
    sec: balance[p.key],
    pct: total > 0 ? Math.round((balance[p.key] / total) * 100) : 0,
  }));

  // Figyelmeztető pillér: kevesebb mint 20%
  const neglected = pillars.filter((p) => p.pct < 20 && p.sec < total * 0.2);

  return (
    <div className="rounded-2xl border border-border/40 bg-card/20 p-5 space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-accent/70">
        Pillér-egyensúly — utóbbi időszak
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
            ⚠ Elhanyagolt pillér:{' '}
            <strong>{neglected.map((p) => p.label).join(', ')}</strong>.
            A könyv alapelve a három terület egyensúlya.
          </p>
        </div>
      )}
    </div>
  );
}
