'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import type { Mondat } from '@/lib/angol-lecke1';
import { shuffleArray } from '@/lib/angol-utils';
import { TTSButton } from '@/components/angol/TTSButton';
import { cn } from '@/lib/utils';

interface PracticeSessionProps {
  sectionId: number;
  sectionName: string;
  mondatok: Mondat[];
  onStartExam?: () => void;
  lastExamScore?: number | null;
  lastExamPassed?: boolean;
}

export function PracticeSession({
  sectionId,
  sectionName,
  mondatok,
  onStartExam,
  lastExamScore,
  lastExamPassed,
}: PracticeSessionProps) {
  const [cards, setCards] = useState(() => shuffleArray(mondatok));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const current = cards[index];
  const total = cards.length;

  const englishText = useMemo(() => {
    if (!current) return '';
    return current.en.split('.')[0].split(',')[0].trim();
  }, [current]);

  useEffect(() => {
    setCards(shuffleArray(mondatok));
    setIndex(0);
    setFlipped(false);
  }, [mondatok, sectionId]);

  const goNext = useCallback(() => {
    setFlipped(false);
    setIndex((i) => (i + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    setFlipped(false);
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  if (!current) return null;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="text-center space-y-1">
        <h2 className="font-display text-xl font-semibold text-cream">{sectionName}</h2>
        <p className="text-sm text-muted-foreground">
          Kártya <span className="font-medium text-slate-300">{index + 1}</span> / {total}
        </p>
      </div>

      <div
        className="relative min-h-48 cursor-pointer"
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className={cn(
            'rounded-3xl border p-10 transition-all duration-500 shadow-card',
            flipped
              ? 'border-slate-400/30 bg-gradient-to-br from-slate-800/50 to-card'
              : 'border-slate-500/20 bg-angol-gradient'
          )}
        >
          {!flipped ? (
            <p className="text-center font-display text-3xl font-medium text-cream">{current.hu}</p>
          ) : (
            <div className="relative">
              <div className="absolute right-0 top-0">
                <TTSButton text={englishText} size="sm" />
              </div>
              <p className="text-center font-display text-2xl font-medium text-slate-200 pr-10">
                {current.en}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={goPrev}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/80"
          aria-label="Előző"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <RotateCcw size={16} />
          Fordítás
        </button>

        <button
          type="button"
          onClick={goNext}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/80"
          aria-label="Következő"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {flipped && (
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg bg-green-600/20 px-6 py-2 text-green-400 hover:bg-green-600/30"
          >
            Helyes ✓
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg bg-red-600/20 px-6 py-2 text-red-400 hover:bg-red-600/30"
          >
            Helytelen ✗
          </button>
        </div>
      )}

      {onStartExam && (
        <div className="premium-card angol-surface mt-8 p-8 text-center space-y-4">
          <h3 className="font-display text-lg font-semibold text-slate-200">Vizsga</h3>
          <p className="text-sm text-muted-foreground">
            20 véletlenszerű kérdés. Minimum 80% szükséges az átlépéshez.
          </p>
          {lastExamScore != null && (
            <p className="text-sm">
              Utolsó eredmény: {lastExamScore}%{' '}
              {lastExamPassed ? '✅' : '❌'}
            </p>
          )}
          <button
            type="button"
            onClick={onStartExam}
            className="rounded-lg bg-accent px-6 py-2.5 font-medium text-accent-foreground hover:bg-accent/90"
          >
            Vizsga indítása
          </button>
        </div>
      )}
    </div>
  );
}