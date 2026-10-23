'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cancel, endSound, hasPlayed, keepAwake, startSound, unlock, vibrate, type ScheduledSound } from './sound';

const RECALL_SEC = 60;

/** 1 minute of quiet recall with closed eyes, between two gongs, before the cards. */
export function RecallStep({ onDone, busy }: { onDone: () => void; busy: boolean }) {
  const t = useTranslations('feherMagia.evening');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const endRef = useRef<ScheduledSound | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const sec = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(sec);
      if (sec >= RECALL_SEC) {
        window.clearInterval(id);
        if (!hasPlayed(endRef.current)) {
          cancel(endRef.current);
          endSound();
        }
        vibrate([200, 100, 200]);
        void wakeRef.current?.release().catch(() => {});
        setRunning(false);
        onDone();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running, onDone]);

  useEffect(
    () => () => {
      cancel(endRef.current);
      void wakeRef.current?.release().catch(() => {});
    },
    []
  );

  const start = async () => {
    unlock();
    startRef.current = Date.now();
    setElapsed(0);
    startSound();
    endRef.current = endSound(RECALL_SEC);
    wakeRef.current = await keepAwake();
    setRunning(true);
  };

  if (running) {
    const c = 2 * Math.PI * 70;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <svg width="168" height="168" className="-rotate-90" aria-hidden>
          <circle cx="84" cy="84" r="70" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
          <circle
            cx="84"
            cy="84"
            r="70"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(1, elapsed / RECALL_SEC))}
            strokeLinecap="round"
            className="text-accent/60 transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <p className="max-w-xs text-sm text-muted-foreground">{t('recallRun')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/30 p-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t('recallLabel')}</p>
        <p className="font-display text-2xl font-semibold text-gradient-gold">{t('recallTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('recallBody')}</p>
      </div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="mt-auto rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 hover:shadow-glow-gold disabled:opacity-50"
      >
        {t('recallStart')}
      </button>
    </div>
  );
}
