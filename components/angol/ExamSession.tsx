'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { MondatPair } from '@/lib/i18n-content';
import { evaluateAnswer, scoreExam, shuffleArray } from '@/lib/angol-utils';
import { createClient } from '@/lib/supabase/client';
import { getNextSectionId } from '@/lib/angol-unlocks';
import { SpeechInput } from '@/components/angol/SpeechInput';
import { cn } from '@/lib/utils';

const PASS_THRESHOLD = 80;

interface ExamSessionProps {
  lessonId: number;
  sectionId: number;
  sectionName: string;
  mondatok: MondatPair[];
  locale: string;
  onClose: () => void;
}

type ExamPhase = 'exam' | 'result';

type WrongAnswer = {
  prompt: string;
  userAnswer: string;
  correctEn: string;
  eval: 'partial' | 'incorrect';
};

export function ExamSession({
  lessonId,
  sectionId,
  sectionName,
  mondatok,
  locale,
  onClose,
}: ExamSessionProps) {
  const t = useTranslations('angol');
  const questions = useMemo(
    () => shuffleArray(mondatok),
    [mondatok]
  );

  const [phase, setPhase] = useState<ExamPhase>('exam');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const [result, setResult] = useState<ReturnType<typeof scoreExam> | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
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
      questions.map((q, i) => ({ user: answers[i], correct: q.answer }))
    );
    setResult(scored);
    const didPass = scored.percent >= PASS_THRESHOLD;
    setPassed(didPass);

    const wrongs: WrongAnswer[] = questions
      .map((q, i) => {
        const ev = evaluateAnswer(answers[i], q.answer);
        return { prompt: q.prompt, userAnswer: answers[i], correctEn: q.answer, eval: ev };
      })
      .filter((w): w is WrongAnswer => w.eval !== 'correct');
    setWrongAnswers(wrongs);

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
        <h2 className="font-display text-2xl font-bold text-cream">{t('examResult')}</h2>
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
            {passed ? t('passedResult') : t('failedResult')}
          </p>
          {!passed && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t('passThresholdMsg', { threshold: PASS_THRESHOLD })}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg bg-green-600/20 p-3">
            <p className="text-green-400 font-medium">{result.correct}</p>
            <p className="text-muted-foreground">{t('correctCount')}</p>
          </div>
          <div className="rounded-lg bg-amber-500/20 p-3">
            <p className="text-amber-400 font-medium">{result.partial}</p>
            <p className="text-muted-foreground">{t('partialCount')}</p>
          </div>
          <div className="rounded-lg bg-red-600/20 p-3">
            <p className="text-red-400 font-medium">{result.incorrect}</p>
            <p className="text-muted-foreground">{t('incorrectCount')}</p>
          </div>
        </div>

        {wrongAnswers.length > 0 && (
          <div className="space-y-3 text-left">
            <h3 className="font-display text-lg font-semibold text-cream">
              {t('wrongAnswersTitle', { count: wrongAnswers.length })}
            </h3>
            <div className="space-y-2">
              {wrongAnswers.map((w, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg border p-3',
                    w.eval === 'partial'
                      ? 'border-amber-500/30 bg-amber-900/20'
                      : 'border-red-500/30 bg-red-900/20'
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{w.prompt}</p>
                  <p className="mt-1 text-sm">
                    <span className="text-muted-foreground">{t('yourAnswer')} </span>
                    <span className={w.eval === 'partial' ? 'text-amber-300' : 'text-red-300'}>
                      {w.userAnswer || t('emptyAnswer')}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t('correctAnswerLabel')} </span>
                    <span className="text-green-300">{w.correctEn}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {passed && unlockedNext !== null && (
            <Link
              href={`/${locale}/modules/angol/lecke/${lessonId}/szakasz/${unlockedNext}`}
              className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('nextSection')} →
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setPhase('exam');
              setCurrentQ(0);
              setAnswers(questions.map(() => ''));
              setResult(null);
              setWrongAnswers([]);
            }}
            className="rounded-lg bg-muted px-6 py-3 hover:bg-muted/80"
          >
            {t('retryExam')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('backToPractice')}
          </button>
        </div>

        {saving && (
          <p className="text-xs text-muted-foreground">{t('savingResult')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h2 className="font-display text-xl font-semibold text-cream">{t('examHeader')} — {sectionName}</h2>
        <p className="text-sm text-muted-foreground">
          {t('examQuestion', { current: currentQ + 1, total })}
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
          <p className="text-sm text-muted-foreground mb-1">{t('hungarianLabel')}</p>
          <p className="text-xl font-medium">{question.prompt}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">{t('englishTranslationLabel')}</p>
          <input
            type="text"
            value={answers[currentQ]}
            onChange={(e) => handleAnswerChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={t('answerPlaceholder')}
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
            {currentQ < total - 1 ? t('next') : t('finishButton')}
          </button>
        </div>

      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {t('backButton')}
      </button>
    </div>
  );
}
