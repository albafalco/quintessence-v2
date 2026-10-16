'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { evaluateAnswer, type AnswerResult } from '@/lib/angol-utils';
import { HARD_ITEM_STREAK_TO_CLEAR, type HardItem } from '@/lib/angol-hard';
import { recordAngolActivity } from '@/lib/angol-activity';
import { speakEnglish, speakableEnglish } from '@/lib/tts';
import { SpeechInput } from '@/components/angol/SpeechInput';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/AppIcon';

interface HardItemsSessionProps {
  initialItems: HardItem[];
  backHref: string;
}

export function HardItemsSession({ initialItems, backHref }: HardItemsSessionProps) {
  const t = useTranslations('angol');
  const [items, setItems] = useState(initialItems);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [cleared, setCleared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [learnedCount, setLearnedCount] = useState(0);
  const activityRecorded = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = items[index];
  const done = !current;

  useEffect(() => {
    if (!result) inputRef.current?.focus();
  }, [index, result]);

  const check = async () => {
    if (!current || result || busy) return;
    const r = evaluateAnswer(answer, current.answer, { commaSeparatedAlternatives: current.kind === 'word' });
    setResult(r);
    setBusy(true);
    setError(null);
    if (!activityRecorded.current) {
      activityRecorded.current = true;
      void recordAngolActivity();
    }
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('answer_angol_hard_item', {
      p_id: current.id,
      p_correct: r === 'correct',
    });
    setBusy(false);
    if (rpcError) {
      console.error('[angol] hard item answer failed', rpcError);
      setError(t('savingResultFailed'));
      return;
    }
    const removed = data === true;
    setCleared(removed);
    if (removed) setLearnedCount((c) => c + 1);
    setItems((prev) =>
      prev.map((it) =>
        it.id === current.id
          ? { ...it, correct_streak: r === 'correct' ? it.correct_streak + 1 : 0, wrong_count: r === 'correct' ? it.wrong_count : it.wrong_count + 1 }
          : it
      )
    );
  };

  const markKnown = async () => {
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('angol_hard_items').delete().eq('id', current.id);
    setBusy(false);
    if (deleteError) {
      setError(t('savingResultFailed'));
      return;
    }
    setLearnedCount((c) => c + 1);
    removeCurrentAndAdvance();
  };

  const removeCurrentAndAdvance = () => {
    setItems((prev) => prev.filter((it) => it.id !== current!.id));
    // the next item slides into the same index
    setAnswer('');
    setResult(null);
    setCleared(false);
  };

  const next = () => {
    if (cleared) {
      removeCurrentAndAdvance();
      return;
    }
    setIndex((i) => i + 1);
    setAnswer('');
    setResult(null);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-6 text-center animate-fade-in">
        <div className="premium-card angol-surface p-8">
          <p className="text-3xl">✦</p>
          <p className="mt-3 font-display text-xl font-semibold text-cream">
            {items.length === 0 ? t('hardAllCleared') : t('hardRoundDone')}
          </p>
          {learnedCount > 0 && <p className="mt-2 text-sm text-green-300">{t('hardLearnedNow', { count: learnedCount })}</p>}
          {items.length > 0 && <p className="mt-2 text-sm text-muted-foreground">{t('hardRemaining', { count: items.length })}</p>}
        </div>
        <div className="flex flex-col gap-3">
          {items.length > 0 && (
            <button type="button" onClick={() => setIndex(0)} className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90">
              {t('listeningAgain')}
            </button>
          )}
          <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
            {t('backToSections')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('examQuestion', { current: index + 1, total: items.length })}
        <span className="ml-2 text-xs text-amber-300/80">{t('hardWrongCount', { count: current.wrong_count })}</span>
      </p>

      <div className="premium-card angol-surface space-y-5 p-6 sm:p-8">
        <div>
          <p className="mb-1 text-sm text-muted-foreground">
            {t('hungarianLabel')}
            {current.kind === 'word' && <span className="ml-2 rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] uppercase">{t('hardWordBadge')}</span>}
          </p>
          <p className="text-xl font-medium">{current.prompt}</p>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            if (!result) void check();
            else next();
          }}
          disabled={Boolean(result)}
          placeholder={t('answerPlaceholder')}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70"
        />

        {result && (
          <div
            className={cn(
              'rounded-xl border p-4 text-sm',
              result === 'correct' && 'border-green-500/30 bg-green-900/20',
              result === 'partial' && 'border-amber-500/30 bg-amber-900/20',
              result === 'incorrect' && 'border-red-500/30 bg-red-900/20'
            )}
          >
            <p className="font-semibold">
              {result === 'correct' ? `✓ ${t('feedbackCorrect')}` : result === 'partial' ? `≈ ${t('feedbackPartial')}` : `✗ ${t('feedbackIncorrect')}`}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-green-300">{current.answer}</p>
              <button
                type="button"
                onClick={() => speakEnglish(speakableEnglish(current.answer, current.kind))}
                className="shrink-0 rounded-full bg-slate-700/50 px-2 py-1 text-xs"
                aria-label={t('listen')}
              >
                <AppIcon name="volume" className="h-3.5 w-3.5 align-[-2px] text-current" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {cleared
                ? `✦ ${t('hardCleared')}`
                : t('hardStreak', { streak: items[index]?.correct_streak ?? 0, total: HARD_ITEM_STREAK_TO_CLEAR })}
            </p>
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          {!result && <SpeechInput onResult={setAnswer} />}
          {!result ? (
            <button type="button" onClick={() => void check()} disabled={busy} className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {t('checkAnswer')}
            </button>
          ) : (
            <button type="button" onClick={next} className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90">
              {t('next')} →
            </button>
          )}
          {!result && (
            <button type="button" onClick={() => void markKnown()} disabled={busy} className="ml-auto text-xs text-muted-foreground hover:text-green-300 disabled:opacity-50">
              ✓ {t('hardMarkKnown')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
