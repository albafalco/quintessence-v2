'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { buildExerciseKey, getNextDailyTargetSec } from '@/lib/magia-utils';
import { toBudapestDate } from '@/lib/push-reminders';
import { MagiaModal } from './MagiaModal';
import { SessionTimer } from './SessionTimer';
import { PostSessionLog } from './PostSessionLog';
import type { MagiaSection, ExerciseType, ExerciseParams, ExerciseStatus } from '@/lib/magia-types';

interface ExerciseRunnerProps {
  fokozatId: number;
  section: MagiaSection;
  exerciseKey: string;
  title: string;
  description: string;
  type: ExerciseType;
  params?: ExerciseParams;
  sessionCount: number;
  currentStatus: ExerciseStatus;
  userId: string;
  onClose: () => void;
  onSessionSaved: () => void;
}

type RunnerStep = 'ready' | 'logging' | 'done';

function getTargetSec(type: ExerciseType, params?: ExerciseParams, sessionCount = 0): number {
  if (type === 'progressive_timed' && params?.startSec && params?.stepSec && params?.maxSec) {
    return getNextDailyTargetSec(params.startSec, params.stepSec, params.maxSec, sessionCount);
  }
  if (params?.targetSec) return params.targetSec;
  return 300;
}

const NO_TIMER_TYPES: ExerciseType[] = ['habit', 'instructional', 'worksheet'];

export function ExerciseRunner({
  fokozatId,
  section,
  exerciseKey,
  title,
  description,
  type,
  params,
  sessionCount,
  currentStatus,
  userId,
  onClose,
  onSessionSaved,
}: ExerciseRunnerProps) {
  const t = useTranslations('magia');
  const [step, setStep] = useState<RunnerStep>('ready');
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [completedDurationSec, setCompletedDurationSec] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());

  const fullKey = buildExerciseKey(section, fokozatId, exerciseKey);
  const targetSec = getTargetSec(type, params, sessionCount);
  const hasTimer = !NO_TIMER_TYPES.includes(type);

  // Célcímke fordítással
  let targetLabel = '';
  if (type === 'progressive_timed' && params?.startSec && params?.stepSec && params?.maxSec) {
    const target = getNextDailyTargetSec(params.startSec, params.stepSec, params.maxSec, sessionCount);
    const base = Math.floor(params.startSec / 60);
    const day = sessionCount + 1;
    const targetMin = Math.floor(target / 60);
    targetLabel = t('runnerDailyGoal', { targetMin, base, day });
  } else if (params?.targetSec) {
    const m = Math.floor(params.targetSec / 60);
    targetLabel = t('runnerGoal', { m });
  }

  const sectionLabel = section === 'szellem'
    ? t('shortSzellem')
    : section === 'lelek'
    ? t('shortLelek')
    : t('shortTest');

  const runSafely = useCallback(
    async (action: () => Promise<void>) => {
      setError(null);
      try {
        await action();
      } catch (err) {
        console.error('[magia] session save failed', err);
        setError(t('saveFailed'));
      }
    },
    [t]
  );

  const saveSession = useCallback(
    async (durationSec: number, completed: boolean) => {
      const supabase = createClient();
      const { data, error: dbError } = await supabase
        .from('magia_sessions')
        .insert({
          user_id: userId,
          fokozat: fokozatId,
          section,
          exercise_key: fullKey,
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          duration_sec: durationSec,
          target_sec: hasTimer ? targetSec : null,
          completed,
        })
        .select('id')
        .single();
      if (dbError) throw dbError;
      return data?.id ?? null;
    },
    [userId, fokozatId, section, fullKey, startedAt, hasTimer, targetSec]
  );

  const updateProgress = useCallback(async () => {
    const supabase = createClient();
    const nextCount = sessionCount + 1;

    const { error: progressError } = await supabase.from('magia_progress').upsert(
      {
        user_id: userId,
        fokozat: fokozatId,
        section,
        exercise_key: fullKey,
        completed: true,
        completed_at: new Date().toISOString(),
        // A new session must never revoke an already mastered exercise.
        status: currentStatus === 'mastered' ? 'mastered' : 'in_progress',
        session_count: nextCount,
      },
      { onConflict: 'user_id,fokozat,section,exercise_key' }
    );
    if (progressError) throw progressError;

    await supabase
      .from('profiles')
      .update({ last_magia_activity_date: toBudapestDate(new Date()) })
      .eq('id', userId);

    setSavedCount(nextCount);
    onSessionSaved();
  }, [userId, fokozatId, section, fullKey, sessionCount, currentStatus, onSessionSaved]);

  const handleTimerComplete = useCallback(
    (durationSec: number) =>
      runSafely(async () => {
        setCompletedDurationSec(durationSec);
        const sid = await saveSession(durationSec, true);
        setSessionId(sid);
        setStep('logging');
      }),
    [saveSession, runSafely]
  );

  const handleTimerStop = useCallback(
    (durationSec: number) =>
      runSafely(async () => {
        setCompletedDurationSec(durationSec);
        const sid = await saveSession(durationSec, false);
        setSessionId(sid);
        setStep('logging');
      }),
    [saveSession, runSafely]
  );

  const handleLogSave = useCallback(
    (data: { rating: number | null; disturbances: string; note: string }) =>
      runSafely(async () => {
        const supabase = createClient();

        if (sessionId) {
          const { error: sessionError } = await supabase
            .from('magia_sessions')
            .update({
              rating: data.rating,
              disturbances: data.disturbances || null,
              note: data.note || null,
            })
            .eq('id', sessionId);
          if (sessionError) throw sessionError;
        }

        if (data.note.trim()) {
          const { error: journalError } = await supabase.from('magia_journal').insert({
            user_id: userId,
            fokozat: fokozatId,
            section,
            exercise_key: fullKey,
            session_id: sessionId,
            entry_date: toBudapestDate(new Date()),
            content: data.note.trim(),
            duration_sec: completedDurationSec,
            disturbances: data.disturbances || null,
          });
          if (journalError) throw journalError;
        }

        await updateProgress();
        setStep('done');
      }),
    [sessionId, userId, fokozatId, section, fullKey, completedDurationSec, updateProgress, runSafely]
  );

  const handleLogSkip = useCallback(
    () =>
      runSafely(async () => {
        await updateProgress();
        setStep('done');
      }),
    [updateProgress, runSafely]
  );

  const handleMarkDone = useCallback(
    () =>
      runSafely(async () => {
        const sid = await saveSession(0, true);
        setSessionId(sid);
        await updateProgress();
        setStep('done');
      }),
    [saveSession, updateProgress, runSafely]
  );

  // Closing during a running timer or before logging would lose the session.
  const requestClose = useCallback(() => {
    if ((timerActive || step === 'logging') && !window.confirm(t('confirmCloseSession'))) return;
    onClose();
  }, [timerActive, step, onClose, t]);

  return (
    // No backdrop dismiss: an accidental tap outside must not lose a running session.
    <MagiaModal onClose={requestClose} closeOnBackdrop={false} ariaLabel={title}>
        {/* Fejléc */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/60">
              {sectionLabel}
            </p>
            <h3 className="font-display text-xl font-semibold text-cream">{title}</h3>
            {targetLabel && (
              <p className="mt-1 text-sm font-medium text-accent">{targetLabel}</p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t('closing')}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:text-cream"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
        )}

        {step === 'ready' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-primary/15 bg-magia-gradient p-4">
              <p className="text-sm leading-relaxed text-cream/85">{description}</p>
            </div>

            {hasTimer ? (
              <SessionTimer
                targetSec={targetSec}
                onComplete={handleTimerComplete}
                onStop={handleTimerStop}
                silenceSec={30}
                onActiveChange={setTimerActive}
              />
            ) : (
              <button
                type="button"
                onClick={handleMarkDone}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent transition-all hover:bg-accent/30 hover:shadow-glow-gold"
              >
                {t('runnerCompletedButton')}
              </button>
            )}
          </div>
        )}

        {step === 'logging' && (
          <PostSessionLog
            durationSec={completedDurationSec}
            onSave={handleLogSave}
            onSkip={handleLogSkip}
          />
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-3xl shadow-glow-gold">
              ✓
            </div>
            <p className="font-display text-lg font-semibold text-cream">{t('runnerSessionSaved')}</p>
            <p className="text-sm text-muted-foreground">
              {t('runnerTotalSessions', { count: savedCount ?? sessionCount })}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-accent/20 px-6 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/30"
            >
              {t('closing')}
            </button>
          </div>
        )}
    </MagiaModal>
  );
}
