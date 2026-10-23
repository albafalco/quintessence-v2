'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ReadingPage, ThoughtStageText } from '@/lib/i18n-content';
import {
  SESSION_KEYS,
  THOUGHT_WINS_TO_ADVANCE,
  acceptBack,
  acceptUp,
  advanceStage,
  applyThoughtOutcome,
  declineBack,
  type ThoughtOffer,
} from '@/lib/magia/path';
import type { Outcome, ThoughtState } from '@/lib/magia/types';
import { UtravaloView } from './UtravaloView';
import { cancel, endSound, hasPlayed, keepAwake, unlock, vibrate, type ScheduledSound } from './sound';

export interface ThoughtSaved {
  state: ThoughtState;
  focus: string | null;
  session: { exercise_key: string; started_at: string; outcome: Outcome };
}

interface ThoughtPracticeProps {
  state: ThoughtState;
  focus: string | null;
  wish: string | null;
  today: string;
  stages: ThoughtStageText[];
  utravalo: ReadingPage[];
  source: string;
  /** The Útravaló of the current stage has been read (the stage was practised before) */
  seen: boolean;
  /** Saves the session and the new path state; returns when stored */
  onSave: (saved: ThoughtSaved, durationSec: number, targetSec: number) => Promise<void>;
  /** Saves a decision taken on an offer (more minutes, back, next stage) */
  onDecide: (state: ThoughtState) => Promise<void>;
  onNext: () => void;
}

type Phase = 'utravalo' | 'intro' | 'run' | 'ask' | 'offer' | 'info' | 'final';

/** Thought practice: observation → discipline → emptiness, 1 to 10 minutes, with the gong. */
export function ThoughtPractice(props: ThoughtPracticeProps) {
  const { state, today, stages, onSave, onDecide, onNext } = props;
  const t = useTranslations('feherMagia.thought');
  const tFlow = useTranslations('feherMagia.flow');
  const stage = Math.min(state.thought_stage, 2);
  const text = stages[stage];
  const [phase, setPhase] = useState<Phase>(props.seen ? 'intro' : 'utravalo');
  const [current, setCurrent] = useState<ThoughtState>(state);
  const [focus, setFocus] = useState(props.focus ?? props.wish ?? '');
  const [offer, setOffer] = useState<ThoughtOffer>(null);
  const [info, setInfo] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startedAtRef = useRef<string>('');
  const startMsRef = useRef(0);
  const endGongRef = useRef<ScheduledSound | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const targetSec = current.thought_minutes * 60;

  const release = useCallback(() => {
    void wakeRef.current?.release().catch(() => {});
    wakeRef.current = null;
  }, []);

  // The timer: a gong starts it, a gong pre-scheduled on the audio clock ends it
  useEffect(() => {
    if (phase !== 'run') return;
    const id = window.setInterval(() => {
      const sec = Math.floor((Date.now() - startMsRef.current) / 1000);
      setElapsed(sec);
      if (sec >= targetSec) {
        window.clearInterval(id);
        if (!hasPlayed(endGongRef.current)) {
          cancel(endGongRef.current);
          endSound();
        }
        endGongRef.current = null;
        vibrate([200, 100, 200]);
        release();
        setPhase('ask');
      }
    }, 250);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void keepAwake().then((w) => (wakeRef.current = w));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [phase, targetSec, release]);

  useEffect(() => () => {
    cancel(endGongRef.current);
    release();
  }, [release]);

  const begin = async () => {
    unlock();
    setError(null);
    startedAtRef.current = new Date().toISOString();
    startMsRef.current = Date.now();
    setElapsed(0);
    endGongRef.current = endSound(targetSec);
    wakeRef.current = await keepAwake();
    setPhase('run');
  };

  const record = async (outcome: Outcome, durationSec: number) => {
    setBusy(true);
    setError(null);
    const result = applyThoughtOutcome(current, outcome, today);
    try {
      await onSave(
        {
          state: result.state,
          focus: stage === 1 ? focus.trim() || null : props.focus,
          session: { exercise_key: SESSION_KEYS.thought(stage), started_at: startedAtRef.current, outcome },
        },
        durationSec,
        targetSec
      );
      setCurrent(result.state);
      return result;
    } catch (err) {
      console.error('[magia] thought session save failed', err);
      setError(tFlow('saveError'));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const answer = async (outcome: Outcome) => {
    const result = await record(outcome, Math.min(elapsed, targetSec));
    if (!result) return;
    const minutes = result.state.thought_minutes;
    if (result.offer) {
      setOffer(result.offer);
      setPhase('offer');
      return;
    }
    if (outcome === 'reszben') setInfo(t('partlyInfo', { minutes }));
    else if (outcome === 'nem') setInfo(t('noInfo', { minutes }));
    else if (minutes >= 10) {
      const wins = result.state.thought_wins;
      setInfo(t('winInfo', { wins, left: THOUGHT_WINS_TO_ADVANCE - wins }));
    } else setInfo(t('raisedToday'));
    setPhase('info');
  };

  const tired = async () => {
    cancel(endGongRef.current);
    endGongRef.current = null;
    release();
    // `elapsed` is refreshed four times a second by the timer
    const result = await record('reszben', elapsed);
    if (!result) return;
    setInfo(t('tiredInfo'));
    setPhase('info');
  };

  const decide = async (next: ThoughtState, then: Phase | 'next') => {
    setBusy(true);
    setError(null);
    try {
      await onDecide(next);
      setCurrent(next);
      if (then === 'next') onNext();
      else setPhase(then);
    } catch (err) {
      console.error('[magia] thought decision save failed', err);
      setError(tFlow('saveError'));
    } finally {
      setBusy(false);
    }
  };

  const primary =
    'rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/30 hover:shadow-glow-gold disabled:opacity-50';
  const secondary =
    'rounded-xl border border-border/50 px-4 py-3 text-sm font-medium text-cream transition hover:border-accent/40 disabled:opacity-50';
  const minutes = current.thought_minutes;

  if (phase === 'utravalo') {
    return <UtravaloView page={props.utravalo[stage]} source={props.source} onDone={() => setPhase('intro')} />;
  }

  if (phase === 'intro') {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <Ladder stages={stages} stage={stage} />
        <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/30 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{text.name}</p>
          <p className="font-display text-4xl font-bold text-cream">{t('minutes', { minutes })}</p>
          <p className="text-sm text-muted-foreground">{text.how}</p>
          {stage === 1 && (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('focusLabel')}
              <input
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                maxLength={120}
                placeholder={t('focusPlaceholder')}
                className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 text-base text-cream"
              />
              <span>{t('focusHint')}</span>
            </label>
          )}
          {minutes >= 10 && <p className="text-xs text-muted-foreground">{t('wins', { wins: current.thought_wins })}</p>}
        </div>
        <button type="button" onClick={begin} className={`mt-auto ${primary}`}>
          {t('start')}
        </button>
      </div>
    );
  }

  if (phase === 'run') {
    const pct = Math.min(100, (elapsed / targetSec) * 100);
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
            strokeDashoffset={c * (1 - pct / 100)}
            strokeLinecap="round"
            className="text-accent/60 transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <p className="max-w-xs text-sm text-muted-foreground">{t('closedEyes')}</p>
        <button type="button" onClick={tired} disabled={busy} className={secondary}>
          {t('tired')}
        </button>
      </div>
    );
  }

  if (phase === 'ask') {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">{t('gong', { minutes })}</p>
        <p className="font-display text-xl text-cream">{text.question}</p>
        <div className="grid grid-cols-3 gap-2">
          {(['igen', 'reszben', 'nem'] as const).map((o) => (
            <button key={o} type="button" disabled={busy} onClick={() => answer(o)} className={secondary}>
              {t(o === 'igen' ? 'yes' : o === 'reszben' ? 'partly' : 'no')}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t('diary')}</p>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  if (phase === 'offer') {
    return (
      <div className="flex flex-1 flex-col gap-5">
        {offer === 'up' && (
          <>
            <p className="font-display text-2xl font-semibold text-gradient-gold">{t('success')}</p>
            <p className="text-cream">{t('offerUp', { minutes, next: minutes + 1 })}</p>
            <div className="mt-auto grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={onNext} className={secondary}>
                {t('stay', { minutes })}
              </button>
              <button type="button" disabled={busy} onClick={() => decide(acceptUp(current, today), 'next')} className={primary}>
                {t('up', { next: minutes + 1 })}
              </button>
            </div>
          </>
        )}
        {offer === 'back' && (
          <>
            <p className="text-cream">{t('backTitle')}</p>
            <p className="text-sm italic text-muted-foreground">{t('backQuote')}</p>
            <div className="mt-auto grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => decide(declineBack(current), 'next')} className={secondary}>
                {t('stay', { minutes })}
              </button>
              <button type="button" disabled={busy} onClick={() => decide(acceptBack(current), 'next')} className={primary}>
                {t('goBack', { prev: minutes - 1 })}
              </button>
            </div>
          </>
        )}
        {offer === 'nextStage' && (
          <>
            <p className="font-display text-2xl font-semibold text-gradient-gold">{text.done}</p>
            <p className="text-sm italic text-muted-foreground">{t('stageQuote')}</p>
            <p className="text-cream">{t('nextStage', { stage: stages[stage + 1].name })}</p>
            <div className="mt-auto grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={onNext} className={secondary}>
                {t('keepPracticing')}
              </button>
              <button type="button" disabled={busy} onClick={() => decide(advanceStage(current), 'next')} className={primary}>
                {t('next')}
              </button>
            </div>
          </>
        )}
        {offer === 'allDone' && (
          <>
            <p className="font-display text-2xl font-semibold text-gradient-gold">{text.done}</p>
            <p className="text-cream">{t('allDone')}</p>
            <button type="button" disabled={busy} onClick={() => decide(advanceStage(current), 'next')} className={`mt-auto ${primary}`}>
              {t('ok')}
            </button>
          </>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="text-cream">{info}</p>
      <button type="button" onClick={onNext} className={`mt-auto ${primary}`}>
        {t('ok')}
      </button>
    </div>
  );
}

function Ladder({ stages, stage }: { stages: ThoughtStageText[]; stage: number }) {
  return (
    <ol className="flex gap-1.5 text-[11px]">
      {stages.map((s, i) => (
        <li
          key={s.short}
          className={
            i < stage
              ? 'flex-1 rounded-lg border border-emerald-400/30 px-2 py-1 text-center text-emerald-400'
              : i === stage
                ? 'flex-1 rounded-lg border border-accent/50 bg-accent/10 px-2 py-1 text-center font-semibold text-accent'
                : 'flex-1 rounded-lg border border-border/40 px-2 py-1 text-center text-muted-foreground'
          }
        >
          {i < stage ? '✓ ' : ''}
          {s.short}
        </li>
      ))}
    </ol>
  );
}
