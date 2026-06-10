'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { MondatPair } from '@/lib/i18n-content';
import { shuffleArray } from '@/lib/angol-utils';
import { TTSButton } from '@/components/angol/TTSButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FlashCardProps {
  lessonId?: number;
  vocabulary: MondatPair[];
  onStartExam?: () => void;
}

export function FlashCard({ lessonId = 1, vocabulary, onStartExam }: FlashCardProps) {
  const t = useTranslations('angol');
  const [cards, setCards] = useState(vocabulary);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const current = cards[index];
  const total = cards.length;

  const englishText = useMemo(() => {
    if (!current) return '';
    return current.answer.split(',')[0].trim();
  }, [current]);

  const saveProgress = useCallback(
    async (correct: boolean) => {
      if (!current) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from('angol_card_progress')
        .select('correct_count, incorrect_count')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .eq('word_hu', current.prompt)
        .maybeSingle();

      await supabase.from('angol_card_progress').upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          word_hu: current.prompt,
          word_en: current.answer,
          correct_count: (existing?.correct_count ?? 0) + (correct ? 1 : 0),
          incorrect_count: (existing?.incorrect_count ?? 0) + (correct ? 0 : 1),
          last_seen: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id,word_hu' }
      );
    },
    [current, lessonId]
  );

  const goNext = useCallback(() => {
    setFlipped(false);
    setIndex((i) => (i + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    setFlipped(false);
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const handleShuffle = () => {
    setCards(shuffleArray(vocabulary));
    setIndex(0);
    setFlipped(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 50) {
      if (diff < 0) goNext();
      else goPrev();
    }
    setTouchStartX(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    if (!flipped) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(englishText);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [flipped, englishText]);

  if (!current) return null;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="flex items-center justify-between">
        <div className="rounded-full border border-border/50 bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground">
          <span className="font-medium text-cream">{index + 1}</span>
          <span className="mx-1 text-border">/</span>
          <span>{total}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleShuffle}>
          <Shuffle className="h-4 w-4" />
          {t('shuffle')}
        </Button>
      </div>

      <div
        className="relative mx-auto h-64 w-full max-w-md cursor-pointer sm:h-72"
        style={{ perspective: '1200px' }}
        onClick={() => setFlipped((f) => !f)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn('flip-card relative h-full w-full', flipped && 'flip-card-flipped')}
        >
          <div className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-slate-500/20 bg-angol-gradient p-10 shadow-card">
            <p className="text-center font-display text-4xl font-semibold text-cream sm:text-5xl">
              {current.prompt}
            </p>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {t('tapToFlip')}
            </p>
          </div>

          <div className="flip-face flip-face-back absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-slate-400/30 bg-gradient-to-br from-slate-800/60 to-card p-10 shadow-card">
            <div className="absolute right-5 top-5">
              <TTSButton text={englishText} size="sm" />
            </div>
            <p className="text-center font-display text-3xl font-semibold text-slate-200 sm:text-4xl">
              {current.answer}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-5">
        <Button variant="secondary" size="icon" onClick={goPrev} className="rounded-full h-12 w-12">
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button variant="default" onClick={() => setFlipped((f) => !f)}>
          <RotateCcw className="h-4 w-4" />
          {t('flip')}
        </Button>

        <Button variant="secondary" size="icon" onClick={goNext} className="rounded-full h-12 w-12">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {flipped && (
        <div className="flex justify-center gap-4 animate-slide-up">
          <Button
            variant="secondary"
            className="border-green-500/30 bg-green-900/20 text-green-300 hover:bg-green-900/40"
            onClick={() => {
              saveProgress(true);
              goNext();
            }}
          >
            {t('knowIt')}
          </Button>
          <Button
            variant="secondary"
            className="border-red-500/30 bg-red-900/20 text-red-300 hover:bg-red-900/40"
            onClick={() => {
              saveProgress(false);
              goNext();
            }}
          >
            {t('stillPracticing')}
          </Button>
        </div>
      )}

      {onStartExam && (
        <div className="flex justify-center border-t border-border/30 pt-4">
          <Button variant="ghost" size="sm" onClick={onStartExam} className="text-muted-foreground hover:text-foreground">
            {t('startExamArrow')}
          </Button>
        </div>
      )}
    </div>
  );
}