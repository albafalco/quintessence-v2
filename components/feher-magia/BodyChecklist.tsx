'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BodyItem } from '@/lib/magia/types';
import { cn } from '@/lib/utils';

interface BodyChecklistProps {
  items: BodyItem[];
  labels: Record<string, string>;
  isDone: (item: BodyItem) => boolean;
  onToggle: (item: BodyItem, done: boolean) => Promise<void>;
  onEdit: () => void;
  onNext: () => void;
  /** Show the water-magic hint at the cold wash */
  showWaterHint: boolean;
}

/** Today's body-training items of one part of the day: tick what is done. */
export function BodyChecklist({ items, labels, isDone, onToggle, onEdit, onNext, showWaterHint }: BodyChecklistProps) {
  const t = useTranslations('feherMagia.body');
  const tItems = useTranslations('feherMagia.items');
  const tFlow = useTranslations('feherMagia.flow');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const allDone = items.every(isDone);

  const toggle = async (item: BodyItem) => {
    setPending(item.key);
    setError(null);
    try {
      await onToggle(item, !isDone(item));
    } catch (err) {
      console.error('[magia] body item save failed', err);
      setError(tFlow('saveError'));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="font-display text-xl font-semibold text-cream">{tItems('body')}</h2>
      <p className="text-sm text-muted-foreground">{t('checklistHint')}</p>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const done = isDone(item);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggle(item)}
              disabled={pending === item.key}
              aria-pressed={done}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition',
                done ? 'border-accent/40 bg-accent/10 text-muted-foreground' : 'border-border/50 bg-card/30 text-cream'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs',
                  done ? 'border-accent bg-accent text-accent-foreground' : 'border-muted-foreground/40'
                )}
              >
                {done ? '✓' : ''}
              </span>
              <span className="flex-1">{item.label ?? labels[item.key] ?? item.key}</span>
            </button>
          );
        })}
      </div>
      {showWaterHint && items.some((i) => i.key === 'hideg_viz') && <p className="text-xs text-muted-foreground">{t('waterHint')}</p>}
      {allDone && <p className="text-sm text-accent">{t('allDone')}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="button" onClick={onEdit} className="self-center text-xs text-muted-foreground underline underline-offset-4 hover:text-accent">
        {t('edit')}
      </button>
      <button
        type="button"
        onClick={onNext}
        className="mt-auto rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 hover:shadow-glow-gold"
      >
        {tFlow('next')}
      </button>
    </div>
  );
}
