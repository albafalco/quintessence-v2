'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ReadingPage } from '@/lib/i18n-content';
import { cn } from '@/lib/utils';
import { UtravaloView } from './UtravaloView';

const primary =
  'rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 disabled:opacity-50';

/** Before sleep: the wish (or the book's peace, contentment and health) and the day's marks. */
export function SleepStep({
  wish,
  quote,
  counts,
  onDone,
}: {
  wish: string | null;
  quote: string;
  counts: { fekete: number; feher: number };
  onDone: () => void;
}) {
  const t = useTranslations('feherMagia.evening');
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-[radial-gradient(circle_at_50%_30%,rgba(91,33,182,0.25),transparent_70%)] px-4 py-10 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t('sleepLabel')}</p>
        <p className="font-display text-3xl font-semibold capitalize text-gradient-gold">{wish ?? t('sleepDefault')}</p>
        <p className="max-w-xs text-sm italic text-muted-foreground">„{quote}”</p>
      </div>
      <p className="text-sm text-cream">{t('summary', { black: counts.fekete, white: counts.feher })}</p>
      <p className="text-sm text-muted-foreground">{t('tomorrow')}</p>
      <button type="button" onClick={onDone} className={`mt-auto ${primary}`}>
        {t('goodNight')}
      </button>
    </div>
  );
}

/** Conscious eating or the magic of water: the Útravaló first, then one tick a day. */
export function HabitStep({
  title,
  label,
  utravalo,
  source,
  seen,
  done,
  onToggle,
  onNext,
}: {
  title: string;
  label: string;
  utravalo: ReadingPage;
  source: string;
  seen: boolean;
  done: boolean;
  onToggle: (done: boolean) => Promise<void>;
  onNext: () => void;
}) {
  const tFlow = useTranslations('feherMagia.flow');
  const [reading, setReading] = useState(!seen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (reading) return <UtravaloView page={utravalo} source={source} onDone={() => setReading(false)} />;

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await onToggle(!done);
    } catch (err) {
      console.error('[magia] habit save failed', err);
      setError(tFlow('saveError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="font-display text-xl font-semibold text-cream">{title}</h2>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
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
        <span className="flex-1">{label}</span>
      </button>
      <button type="button" onClick={() => setReading(true)} className="self-center text-xs text-muted-foreground underline underline-offset-4 hover:text-accent">
        {utravalo.title}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="button" onClick={onNext} className={`mt-auto ${primary}`}>
        {tFlow('next')}
      </button>
    </div>
  );
}
