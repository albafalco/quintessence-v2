'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppIcon } from '@/components/ui/AppIcon';

interface SessionTimerProps {
  targetSec: number;
  onComplete: (durationSec: number) => void;
  onStop: (durationSec: number) => void;
  silenceSec?: number;
  /** Called with true while a session is in progress (silence, running or paused). */
  onActiveChange?: (active: boolean) => void;
}

type TimerState = 'idle' | 'silence' | 'running' | 'paused' | 'completed';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ScheduledGong {
  osc: OscillatorNode;
  at: number;
}

/** Plays the gong at `at` (AudioContext time); defaults to now. */
function playGong(ctx: AudioContext, volume = 0.4, at = ctx.currentTime): ScheduledGong {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(432, at);
  osc.frequency.exponentialRampToValueAtTime(216, at + 2);
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 3);
  osc.start(at);
  osc.stop(at + 3);
  return { osc, at };
}

export function SessionTimer({ targetSec, onComplete, onStop, silenceSec = 0, onActiveChange }: SessionTimerProps) {
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
  // Gong scheduled in advance on the audio clock, so it can sound at the
  // target time even while rendering (requestAnimationFrame) is paused.
  const scheduledGongRef = useRef<ScheduledGong | null>(null);

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

  const cancelGong = useCallback(() => {
    const gong = scheduledGongRef.current;
    scheduledGongRef.current = null;
    if (!gong) return;
    try {
      gong.osc.stop();
      gong.osc.disconnect();
    } catch {
      // already stopped
    }
  }, []);

  const scheduleGong = useCallback(
    (remainingSec: number) => {
      cancelGong();
      if (remainingSec <= 0) return;
      try {
        const ctx = getAudioCtx();
        scheduledGongRef.current = playGong(ctx, 0.4, ctx.currentTime + remainingSec);
      } catch {
        // Web Audio nem elérhető, nem kritikus
      }
    },
    [cancelGong, getAudioCtx]
  );

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
      // If the pre-scheduled gong has already sounded (or is sounding), do not
      // play it twice; otherwise (e.g. the audio clock was suspended while the
      // screen was locked) play it now.
      const gong = scheduledGongRef.current;
      const ctx = audioCtxRef.current;
      const alreadyPlayed = gong && ctx && ctx.state === 'running' && ctx.currentTime >= gong.at - 0.25;
      if (!alreadyPlayed) {
        cancelGong();
        try { playGong(getAudioCtx()); } catch {}
      }
      scheduledGongRef.current = null;
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setState('completed');
      releaseWakeLock();
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [targetSec, getAudioCtx, releaseWakeLock, cancelGong]);

  // iOS only lets an AudioContext produce sound if it is created/resumed inside
  // a user gesture — unlock it on tap so the end-of-session gong is audible.
  const unlockAudio = useCallback(() => {
    try {
      void getAudioCtx().resume();
    } catch {
      // Web Audio nem elérhető, nem kritikus
    }
  }, [getAudioCtx]);

  const handleStart = useCallback(async () => {
    unlockAudio();
    completedRef.current = false;
    if (silenceSec > 0) {
      setState('silence');
      setSilenceCountdown(silenceSec);
    } else {
      startTsRef.current = Date.now();
      accumulatedRef.current = 0;
      setState('running');
      scheduleGong(targetSec);
      await requestWakeLock();
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [silenceSec, requestWakeLock, tick, unlockAudio, scheduleGong, targetSec]);

  const handlePause = useCallback(() => {
    if (startTsRef.current !== null) {
      accumulatedRef.current += Math.floor((Date.now() - startTsRef.current) / 1000);
      startTsRef.current = null;
    }
    stopRaf();
    releaseWakeLock();
    cancelGong();
    setState('paused');
  }, [stopRaf, releaseWakeLock, cancelGong]);

  const handleResume = useCallback(async () => {
    unlockAudio();
    startTsRef.current = Date.now();
    setState('running');
    scheduleGong(targetSec - accumulatedRef.current);
    await requestWakeLock();
    rafRef.current = requestAnimationFrame(tick);
  }, [requestWakeLock, tick, unlockAudio, scheduleGong, targetSec]);

  const handleStop = useCallback(() => {
    stopRaf();
    releaseWakeLock();
    cancelGong();
    const elapsed = startTsRef.current !== null
      ? accumulatedRef.current + Math.floor((Date.now() - startTsRef.current) / 1000)
      : accumulatedRef.current;
    onStop(elapsed);
  }, [stopRaf, releaseWakeLock, cancelGong, onStop]);

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
      scheduleGong(targetSec);
      requestWakeLock();
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const id = setTimeout(() => setSilenceCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [state, silenceCountdown, requestWakeLock, tick, scheduleGong, targetSec]);

  // The browser releases the wake lock when the page is hidden (app switch,
  // screen lock); take it again when the user returns to a running session.
  useEffect(() => {
    if (state !== 'running') return;
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      void requestWakeLock();
      void audioCtxRef.current?.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [state, requestWakeLock]);

  useEffect(() => {
    onActiveChange?.(state === 'silence' || state === 'running' || state === 'paused');
  }, [state, onActiveChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopRaf();
      releaseWakeLock();
      cancelGong();
    };
  }, [stopRaf, releaseWakeLock, cancelGong]);

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
        <AppIcon name="play" className="h-4 w-4 text-current" />
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
            <AppIcon name="pause" className="mr-1.5 h-4 w-4 align-[-3px] text-current" />
            {t('timerPause')}
          </button>
        )}
        {state === 'paused' && (
          <button
            type="button"
            onClick={handleResume}
            className="rounded-xl bg-accent/20 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/30"
          >
            <AppIcon name="play" className="mr-1.5 h-4 w-4 align-[-3px] text-current" />
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
