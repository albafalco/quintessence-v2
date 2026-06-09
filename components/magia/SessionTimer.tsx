'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface SessionTimerProps {
  targetSec: number;
  onComplete: (durationSec: number) => void;
  onStop: (durationSec: number) => void;
  silenceSec?: number;
}

type TimerState = 'idle' | 'silence' | 'running' | 'paused' | 'completed';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function playGong(ctx: AudioContext, volume = 0.4) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(432, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(216, ctx.currentTime + 2);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 3);
}

export function SessionTimer({ targetSec, onComplete, onStop, silenceSec = 0 }: SessionTimerProps) {
  const t = useTranslations('magia');
  const [state, setState] = useState<TimerState>('idle');
  const [displaySec, setDisplaySec] = useState(0);
  const [silenceCountdown, setSilenceCountdown] = useState(silenceSec);

  const startTsRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const completedRef = useRef(false);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // Wake Lock nem elérhető, nem kritikus
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (startTsRef.current === null) return;
    const elapsed = accumulatedRef.current + Math.floor((Date.now() - startTsRef.current) / 1000);
    setDisplaySec(elapsed);

    if (!completedRef.current && elapsed >= targetSec) {
      completedRef.current = true;
      try { playGong(getAudioCtx()); } catch {}
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setState('completed');
      releaseWakeLock();
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [targetSec, getAudioCtx, releaseWakeLock]);

  const handleStart = useCallback(async () => {
    completedRef.current = false;
    if (silenceSec > 0) {
      setState('silence');
      setSilenceCountdown(silenceSec);
    } else {
      startTsRef.current = Date.now();
      accumulatedRef.current = 0;
      setState('running');
      await requestWakeLock();
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [silenceSec, requestWakeLock, tick]);

  const handlePause = useCallback(() => {
    if (startTsRef.current !== null) {
      accumulatedRef.current += Math.floor((Date.now() - startTsRef.current) / 1000);
      startTsRef.current = null;
    }
    stopRaf();
    releaseWakeLock();
    setState('paused');
  }, [stopRaf, releaseWakeLock]);

  const handleResume = useCallback(async () => {
    startTsRef.current = Date.now();
    setState('running');
    await requestWakeLock();
    rafRef.current = requestAnimationFrame(tick);
  }, [requestWakeLock, tick]);

  const handleStop = useCallback(() => {
    stopRaf();
    releaseWakeLock();
    const elapsed = startTsRef.current !== null
      ? accumulatedRef.current + Math.floor((Date.now() - startTsRef.current) / 1000)
      : accumulatedRef.current;
    onStop(elapsed);
  }, [stopRaf, releaseWakeLock, onStop]);

  const handleComplete = useCallback(() => {
    onComplete(displaySec);
  }, [displaySec, onComplete]);

  // Csend visszaszámláló
  useEffect(() => {
    if (state !== 'silence') return;
    if (silenceCountdown <= 0) {
      startTsRef.current = Date.now();
      accumulatedRef.current = 0;
      setState('running');
      requestWakeLock();
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const id = setTimeout(() => setSilenceCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [state, silenceCountdown, requestWakeLock, tick]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopRaf();
      releaseWakeLock();
    };
  }, [stopRaf, releaseWakeLock]);

  const remaining = Math.max(0, targetSec - displaySec);
  const progressPct = Math.min(100, (displaySec / targetSec) * 100);
  const circumference = 2 * Math.PI * 54;

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={handleStart}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition-all hover:bg-accent/30 hover:shadow-glow-gold"
      >
        <span className="text-base">▶</span>
        {t('timerStartButton')}
      </button>
    );
  }

  if (state === 'silence') {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <p className="text-sm text-muted-foreground">{t('timerSilencing')}</p>
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
          <span className="font-display text-3xl font-bold text-accent">{silenceCountdown}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Körös progress */}
      <div className="relative">
        <svg width="128" height="128" className="-rotate-90">
          <circle cx="64" cy="64" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
          <circle
            cx="64" cy="64" r="54" fill="none"
            stroke="currentColor" strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progressPct / 100)}
            strokeLinecap="round"
            className="text-accent transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {state === 'completed' ? (
            <span className="text-3xl">✓</span>
          ) : (
            <>
              <span className="font-display text-2xl font-bold text-cream">{formatTime(remaining)}</span>
              <span className="text-[10px] text-muted-foreground">{t('timerRemaining')}</span>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('timerElapsed')} <strong className="text-cream">{formatTime(displaySec)}</strong>
        {' · '}
        {t('timerTarget')} <strong className="text-cream">{formatTime(targetSec)}</strong>
      </p>

      {/* Gombok */}
      <div className="flex gap-3">
        {state === 'running' && (
          <button
            type="button"
            onClick={handlePause}
            className="rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-muted/50"
          >
            {t('timerPause')}
          </button>
        )}
        {state === 'paused' && (
          <button
            type="button"
            onClick={handleResume}
            className="rounded-xl bg-accent/20 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/30"
          >
            {t('timerResume')}
          </button>
        )}
        {state === 'completed' && (
          <button
            type="button"
            onClick={handleComplete}
            className="rounded-xl bg-accent/20 px-5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/30 hover:shadow-glow-gold"
          >
            {t('timerLog')}
          </button>
        )}
        {(state === 'running' || state === 'paused') && (
          <button
            type="button"
            onClick={handleStop}
            className="rounded-xl border border-border/40 px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:border-red-400/40 hover:text-red-400"
          >
            {t('timerStop')}
          </button>
        )}
      </div>
    </div>
  );
}
