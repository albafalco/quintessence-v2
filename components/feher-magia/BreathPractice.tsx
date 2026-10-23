'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ReadingPage } from '@/lib/i18n-content';
import { BREATH_MAX_SEC, addDays, afterBreath, breathTargetFor } from '@/lib/magia/path';
import type { BreathState } from '@/lib/magia/types';
import { cn } from '@/lib/utils';
import { UtravaloView } from './UtravaloView';
import { endSound, keepAwake, tick, unlock, vibrate } from './sound';

interface BreathPracticeProps {
  state: BreathState;
  wish: string | null;
  wishes: string[];
  today: string;
  utravalo: ReadingPage;
  source: string;
  seen: boolean;
  onWish: (wish: string) => Promise<void>;
  onSave: (next: BreathState, reps: number, durationSec: number, startedAt: string) => Promise<void>;
  onNext: () => void;
}

type Phase = 'utravalo' | 'wish' | 'intro' | 'count' | 'done';

/** Conscious breathing with a blind counter: the whole screen is one button. */
export function BreathPractice(props: BreathPracticeProps) {
  const { today, onSave, onNext } = props;
  const t = useTranslations('feherMagia.breath');
  const tFlow = useTranslations('feherMagia.flow');
  const target = breathTargetFor(props.state, today);
  const [phase, setPhase] = useState<Phase>(!props.seen ? 'utravalo' : props.wish ? 'intro' : 'wish');
  const [wish, setWish] = useState(props.wish ?? '');
  const [ownWish, setOwnWish] = useState('');
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [result, setResult] = useState<{ next: number; capped: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef('');
  const startMsRef = useRef(0);
  const wakeRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => () => void wakeRef.current?.release().catch(() => {}), []);

  const saveWish = async (value: string) => {
    const v = value.trim();
    if (!v) return;
    setBusy(true);
    setError(null);
    try {
      await props.onWish(v);
      setWish(v);
      setPhase('intro');
    } catch (err) {
      console.error('[magia] wish save failed', err);
      setError(tFlow('saveError'));
    } finally {
      setBusy(false);
    }
  };

  const begin = async () => {
    unlock();
    startedAtRef.current = new Date().toISOString();
    startMsRef.current = Date.now();
    setCount(0);
    wakeRef.current = await keepAwake();
    setPhase('count');
  };

  const finish = async (reps: number) => {
    setBusy(true);
    setError(null);
    void wakeRef.current?.release().catch(() => {});
    const durationSec = Math.round((Date.now() - startMsRef.current) / 1000);
    const next = afterBreath(props.state, reps, durationSec, today);
    try {
      await onSave(next, reps, durationSec, startedAtRef.current);
      setResult({ next: breathTargetFor(next, addDays(today, 1)), capped: reps >= target && durationSec >= BREATH_MAX_SEC });
      setPhase('done');
    } catch (err) {
      console.error('[magia] breath session save failed', err);
      setError(tFlow('saveError'));
    } finally {
      setBusy(false);
    }
  };

  const breathe = () => {
    if (busy || count >= target) return;
    const n = count + 1;
    setCount(n);
    if (n >= target) {
      endSound();
      vibrate([200, 100, 200]);
      void finish(n);
      return;
    }
    tick();
    vibrate(15);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 180);
  };

  const primary =
    'rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 disabled:opacity-50';

  if (phase === 'utravalo') {
    return <UtravaloView page={props.utravalo} source={props.source} onDone={() => setPhase(wish ? 'intro' : 'wish')} />;
  }

  if (phase === 'wish') {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-cream">{t('wishTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('wishHint')}</p>
        <div className="flex flex-wrap gap-2">
          {props.wishes.map((w) => (
            <button
              key={w}
              type="button"
              disabled={busy}
              onClick={() => saveWish(w)}
              className="rounded-full border border-border/50 bg-card/30 px-4 py-2 text-sm text-cream transition hover:border-accent/50"
            >
              {w}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('wishOwn')}
          <input
            value={ownWish}
            onChange={(e) => setOwnWish(e.target.value)}
            maxLength={80}
            placeholder={t('wishPlaceholder')}
            className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-base text-cream"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="button" disabled={busy || !ownWish.trim()} onClick={() => saveWish(ownWish)} className={`mt-auto ${primary}`}>
          {t('wishSave')}
        </button>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/30 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t('title')}</p>
          <p className="font-display text-3xl font-bold capitalize text-gradient-gold">{wish}</p>
          <p className="text-sm text-muted-foreground">{t('intro', { target })}</p>
          <p className="text-xs text-muted-foreground">{t('iphone')}</p>
        </div>
        <button type="button" onClick={() => setPhase('wish')} className="self-center text-xs text-muted-foreground underline underline-offset-4 hover:text-accent">
          {t('wishChange')}
        </button>
        <button type="button" onClick={begin} className={`mt-auto ${primary}`}>
          {t('begin')}
        </button>
      </div>
    );
  }

  if (phase === 'count') {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="capitalize">{wish}</span>
          <span className="tabular-nums">{t('target', { target })}</span>
        </div>
        <button
          type="button"
          onClick={breathe}
          className={cn(
            'flex min-h-[55dvh] flex-1 flex-col items-center justify-center gap-3 rounded-3xl border border-border/30 bg-[radial-gradient(circle_at_50%_40%,rgba(91,33,182,0.25),transparent_70%)] transition',
            flash && 'border-accent/40'
          )}
          aria-label={t('tap')}
        >
          <span className="font-display text-6xl font-bold tabular-nums text-cream/30">{count}</span>
          <span className="text-sm text-muted-foreground">{t('tap')}</span>
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          disabled={busy || count === 0}
          onClick={() => finish(count)}
          className="rounded-xl border border-border/50 px-4 py-2.5 text-sm text-muted-foreground transition hover:text-cream disabled:opacity-40"
        >
          {t('stop')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <p className="font-display text-2xl font-semibold text-gradient-gold">{t('done', { count })}</p>
      {result && <p className="text-cream">{result.capped ? t('capped') : t('tomorrow', { next: result.next })}</p>}
      <button type="button" onClick={onNext} className={`mt-auto ${primary}`}>
        {tFlow('next')}
      </button>
    </div>
  );
}
