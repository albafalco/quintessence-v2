'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { MondatPair } from '@/lib/i18n-content';
import { buildReviewQueue, type CardScheduleRow } from '@/lib/angol-srs';
import { isMissingColumnError } from '@/lib/supabase/missing-column';
import { toBudapestDate } from '@/lib/push-reminders';
import { speakEnglish, speakableEnglish } from '@/lib/tts';
import { FlashCard } from '@/components/angol/FlashCard';
import { TTSButton } from '@/components/angol/TTSButton';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/AppIcon';

interface VocabularyTrainerProps {
  lessonId: number;
  vocabulary: MondatPair[];
  onStartExam: () => void;
}

type Tab = 'review' | 'all';
type Schedule = { status: 'loading' } | { status: 'unavailable' } | { status: 'ready'; queue: MondatPair[] };

export function VocabularyTrainer({ lessonId, vocabulary, onStartExam }: VocabularyTrainerProps) {
  const t = useTranslations('angol');
  const [schedule, setSchedule] = useState<Schedule>({ status: 'loading' });
  const [tab, setTab] = useState<Tab | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const { data, error } = await supabase
        .from('angol_card_progress')
        .select('word_hu, due_on, introduced_on')
        .eq('user_id', sessionData.session.user.id)
        .eq('lesson_id', lessonId);
      if (cancelled) return;
      // Before migration 009 there is no schedule: only the "all cards" mode
      if (error) {
        if (!isMissingColumnError(error)) console.error('[angol] loading card schedule failed', error);
        setSchedule({ status: 'unavailable' });
        return;
      }
      const queue = buildReviewQueue(vocabulary, (data ?? []) as CardScheduleRow[], toBudapestDate(new Date()));
      setSchedule({ status: 'ready', queue });
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, vocabulary]);

  const reviewCount = schedule.status === 'ready' ? schedule.queue.length : 0;
  // Default: today's review when there is something to review
  const activeTab: Tab = tab ?? (schedule.status === 'ready' && reviewCount > 0 ? 'review' : 'all');

  return (
    <div className="space-y-6">
      {schedule.status !== 'unavailable' && (
        <div className="mx-auto flex max-w-md gap-2">
          <button
            type="button"
            onClick={() => setTab('review')}
            className={cn(
              'flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
              activeTab === 'review' ? 'border-accent/50 bg-accent/15 text-accent' : 'border-border/50 text-muted-foreground hover:text-cream'
            )}
          >
            <AppIcon name="repeat" className="mr-1.5 h-4 w-4 align-[-3px] text-current" />
            {t('reviewToday')}
            {schedule.status === 'ready' && ` (${reviewCount})`}
          </button>
          <button
            type="button"
            onClick={() => setTab('all')}
            className={cn(
              'flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
              activeTab === 'all' ? 'border-accent/50 bg-accent/15 text-accent' : 'border-border/50 text-muted-foreground hover:text-cream'
            )}
          >
            {t('allCards')}
          </button>
        </div>
      )}

      {activeTab === 'review' && schedule.status === 'loading' && (
        <p className="text-center text-sm text-muted-foreground">{t('reviewLoading')}</p>
      )}
      {activeTab === 'review' && schedule.status === 'ready' && (
        <ReviewSession key={schedule.queue.length} lessonId={lessonId} initialQueue={schedule.queue} />
      )}
      {activeTab === 'all' && <FlashCard lessonId={lessonId} vocabulary={vocabulary} onStartExam={onStartExam} />}
    </div>
  );
}

function ReviewSession({ lessonId, initialQueue }: { lessonId: number; initialQueue: MondatPair[] }) {
  const t = useTranslations('angol');
  const [queue, setQueue] = useState(initialQueue);
  const [lapsed, setLapsed] = useState<Set<string>>(new Set());
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const current = queue[0];

  const save = useCallback(
    async (card: MondatPair, correct: boolean) => {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc('increment_angol_card', {
        p_lesson_id: lessonId,
        p_word_hu: card.prompt,
        p_word_en: card.answer,
        p_correct: correct,
      });
      if (rpcError) {
        console.error('[angol] review save failed', rpcError);
        setError(t('savingResultFailed'));
      } else {
        setError(null);
      }
    },
    [lessonId, t]
  );

  const flip = () => {
    if (!current) return;
    const next = !flipped;
    if (next) speakEnglish(speakableEnglish(current.answer, 'word'));
    setFlipped(next);
  };

  const answer = (known: boolean) => {
    if (!current) return;
    const alreadyLapsed = lapsed.has(current.prompt);
    // Each card is scheduled once per day: a card re-shown after "still
    // practising" only has to be answered to leave today's queue.
    if (!alreadyLapsed) void save(current, known);
    setFlipped(false);
    if (known) {
      setQueue((q) => q.slice(1));
      setReviewed((r) => r + 1);
    } else {
      setLapsed((prev) => new Set(prev).add(current.prompt));
      setQueue((q) => [...q.slice(1), q[0]]);
    }
  };

  if (!current) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-accent/20 bg-accent/5 p-8 text-center animate-fade-in">
        <p className="text-3xl">✦</p>
        <p className="mt-3 font-display text-xl font-semibold text-cream">{t('reviewDone')}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {reviewed > 0 ? t('reviewDoneCount', { count: reviewed }) : t('reviewNothingDue')}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <p className="text-center text-sm text-muted-foreground">{t('reviewRemaining', { count: queue.length })}</p>

      <button
        type="button"
        onClick={flip}
        className={cn(
          'relative flex h-64 w-full flex-col items-center justify-center rounded-3xl border p-8 shadow-card transition-colors sm:h-72',
          flipped ? 'border-slate-400/30 bg-gradient-to-br from-slate-800/60 to-card' : 'border-slate-500/20 bg-angol-gradient'
        )}
      >
        {!flipped ? (
          <>
            <span className="text-center font-display text-4xl font-semibold text-cream sm:text-5xl">{current.prompt}</span>
            <span className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('tapToFlip')}</span>
          </>
        ) : (
          <span className="text-center font-display text-3xl font-semibold text-slate-200 sm:text-4xl">{current.answer}</span>
        )}
      </button>

      {flipped && (
        <div className="flex items-center justify-center gap-3 animate-slide-up">
          <TTSButton text={speakableEnglish(current.answer, 'word')} size="md" />
          <button
            type="button"
            onClick={() => answer(true)}
            className="rounded-xl border border-green-500/30 bg-green-900/20 px-5 py-2.5 text-sm font-semibold text-green-300 hover:bg-green-900/40"
          >
            {t('knowIt')}
          </button>
          <button
            type="button"
            onClick={() => answer(false)}
            className="rounded-xl border border-red-500/30 bg-red-900/20 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-900/40"
          >
            {t('stillPracticing')}
          </button>
        </div>
      )}

      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
