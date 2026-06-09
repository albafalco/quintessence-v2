'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SZOLAP_1 } from '@/lib/angol-szolap';
import { shuffleArray } from '@/lib/angol-utils';
import { TTSButton } from '@/components/angol/TTSButton';
import { cn } from '@/lib/utils';

interface FlashCardProps {
  lessonId?: number;
}

export function FlashCard({ lessonId = 1 }: FlashCardProps) {
  const [cards, setCards] = useState(SZOLAP_1);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const current = cards[index];
  const total = cards.length;

  const englishText = useMemo(() => {
    if (!current) return '';
    return current.en.split(',')[0].trim();
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
        .eq('word_hu', current.hu)
        .maybeSingle();

      await supabase.from('angol_card_progress').upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          word_hu: current.hu,
          word_en: current.en,
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
    setCards(shuffleArray(SZOLAP_1));
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

  if (!current) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Kártya {index + 1}/{total}
        </span>
        <button
          type="button"
          onClick={handleShuffle}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
        >
          <Shuffle size={16} />
          Keverés
        </button>
      </div>

      <div
        className="relative h-56 cursor-pointer perspective-1000"
        onClick={() => setFlipped((f) => !f)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn(
            'relative h-full w-full transition-transform duration-500 transform-style-3d',
            flipped && 'rotate-y-180'
          )}
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* Front — Hungarian */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-center text-3xl font-semibold">{current.hu}</p>
            <p className="mt-4 text-sm text-muted-foreground">Kattints a fordításhoz</p>
          </div>

          {/* Back — English */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 p-8"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="absolute right-4 top-4">
              <TTSButton text={englishText} size="sm" />
            </div>
            <p className="text-center text-3xl font-semibold text-primary">{current.en}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={goPrev}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
          aria-label="Előző"
        >
          <ChevronLeft size={24} />
        </button>

        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RotateCcw size={16} />
          Fordítás
        </button>

        <button
          type="button"
          onClick={goNext}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
          aria-label="Következő"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {flipped && (
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => {
              saveProgress(true);
              goNext();
            }}
            className="rounded-lg bg-green-600/20 px-6 py-2 text-green-400 hover:bg-green-600/30"
          >
            Tudom ✓
          </button>
          <button
            type="button"
            onClick={() => {
              saveProgress(false);
              goNext();
            }}
            className="rounded-lg bg-red-600/20 px-6 py-2 text-red-400 hover:bg-red-600/30"
          >
            Még gyakorolom ✗
          </button>
        </div>
      )}
    </div>
  );
}