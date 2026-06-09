'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Mondat } from '@/lib/angol-lecke1';
import { scoreExam, shuffleArray } from '@/lib/angol-utils';
import { createClient } from '@/lib/supabase/client';
import { getNextSectionId } from '@/lib/angol-unlocks';
import { SpeechInput } from '@/components/angol/SpeechInput';
import { cn } from '@/lib/utils';

const EXAM_SIZE = 20;
const PASS_THRESHOLD = 80;

interface ExamSessionProps {
  lessonId: number;
  sectionId: number;
  sectionName: string;
  mondatok: Mondat[];
  locale: string;
  onClose: () => void;
}

type ExamPhase = 'exam' | 'result';

export function ExamSession({
  lessonId,
  sectionId,
  sectionName,
  mondatok,
  locale,
  onClose,
}: ExamSessionProps) {
  const questions = useMemo(
    () => shuffleArray(mondatok).slice(0, Math.min(EXAM_SIZE, mondatok.length)),
    [mondatok]
  );

  const [phase, setPhase] = useState<ExamPhase>('exam');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const [result, setResult] = useState<ReturnType<typeof scoreExam> | null>(null);
  const [passed, setPassed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unlockedNext, setUnlockedNext] = useState<number | null>(null);

  const question = questions[currentQ];
  const total = questions.length;

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = value;
      return next;
    });
  };

  const saveResults = useCallback(async () => {
    const scored = scoreExam(
      questions.map((q, i) => ({ user: answers[i], correct: q.en }))
    );
    setResult(scored);
    const didPass = scored.percent >= PASS_THRESHOLD;
    setPassed(didPass);
    setPhase('result');
    setSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('angol_exam_results').insert({
        user_id: user.id,
        lesson_id: lessonId,
        section_id: sectionId,
        score: scored.percent,
        passed: didPass,
      });

      if (didPass) {
        const nextId = getNextSectionId(sectionId);
        if (nextId !== null) {
          await supabase.from('angol_section_unlocks').upsert(
            {
              user_id: user.id,
              lesson_id: lessonId,
              section_id: nextId,
            },
            { onConflict: 'user_id,lesson_id,section_id' }
          );
          setUnlockedNext(nextId);
        }
      }
    } finally {
      setSaving(false);
    }
  }, [answers, lessonId, questions, sectionId]);

  const handleSubmit = () => {
    if (currentQ < total - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      saveResults();
    }
  };

  if (phase === 'result' && result) {
    return (
      <div className="mx-auto max-w-md space-y-8 text-center animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-cream">Vizsga eredmény</h2>
        <div
          className={cn(
            'premium-card p-10',
            passed
              ? 'border-green-500/30 bg-green-900/15 shadow-[0_0_40px_-10px_rgba(34,197,94,0.3)]'
              : 'border-red-500/30 bg-red-900/15 shadow-[0_0_40px_-10px_rgba(239,68,68,0.2)]'
          )}
        >
          <p className="font-display text-5xl font-bold text-cream">
            {result.correct + result.partial * 0.5}/{total}
          </p>
          <p className="mt-3 font-display text-4xl font-semibold text-gradient-gold">{result.percent}%</p>
          <p className="mt-6 text-lg font-medium">
            {passed ? '✅ Sikeresen teljesítve!' : '❌ Nem sikerült'}
          </p>
          {!passed && (
            <p className="mt-2 text-sm text-muted-foreground">
              Min. {PASS_THRESHOLD}% szükséges
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg bg-green-600/20 p-3">
            <p className="text-green-400 font-medium">{result.correct}</p>
            <p className="text-muted-foreground">Helyes</p>
          </div>
          <div className="rounded-lg bg-amber-500/20 p-3">
            <p className="text-amber-400 font-medium">{result.partial}</p>
            <p className="text-muted-foreground">Részleges</p>
          </div>
          <div className="rounded-lg bg-red-600/20 p-3">
            <p className="text-red-400 font-medium">{result.incorrect}</p>
            <p className="text-muted-foreground">Helytelen</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {passed && unlockedNext !== null && (
            <Link
              href={`/${locale}/modules/angol/lecke/${lessonId}/szakasz/${unlockedNext}`}
              className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
            >
              Következő szakasz →
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setPhase('exam');
              setCurrentQ(0);
              setAnswers(questions.map(() => ''));
              setResult(null);
            }}
            className="rounded-lg bg-muted px-6 py-3 hover:bg-muted/80"
          >
            Újra próbálom
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Visszatérés a gyakorláshoz
          </button>
        </div>

        {saving && (
          <p className="text-xs text-muted-foreground">Eredmény mentése...</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h2 className="font-display text-xl font-semibold text-cream">Vizsga — {sectionName}</h2>
        <p className="text-sm text-muted-foreground">
          Kérdés {currentQ + 1} / {total}
        </p>
        <div className="mt-2 flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                i < currentQ
                  ? 'bg-primary'
                  : i === currentQ
                    ? 'bg-accent'
                    : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      <div className="premium-card angol-surface p-8 space-y-5">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Magyar:</p>
          <p className="text-xl font-medium">{question.hu}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Angol fordítás:</p>
          <input
            type="text"
            value={answers[currentQ]}
            onChange={(e) => handleAnswerChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Írd be az angol fordítást..."
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SpeechInput onResult={handleAnswerChange} />
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90"
          >
            {currentQ < total - 1 ? 'Következő' : 'Befejezés'}
          </button>
        </div>

      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Vissza a gyakorláshoz
      </button>
    </div>
  );
}