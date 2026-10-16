'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MondatPair } from '@/lib/i18n-content';
import { evaluateAnswer, shuffleArray, type AnswerResult } from '@/lib/angol-utils';
import { speakEnglish, speakableEnglish, stopSpeaking, TTS_RATE_NORMAL, TTS_RATE_SLOW } from '@/lib/tts';
import { recordHardItems } from '@/lib/angol-hard';
import { recordAngolActivity } from '@/lib/angol-activity';
import { SpeechInput } from '@/components/angol/SpeechInput';
import { cn } from '@/lib/utils';

const ROUND_SIZE = 10;

interface ListeningSessionProps {
  lessonId: number;
  sectionId: number;
  items: MondatPair[];
  kind: 'sentence' | 'word';
}

type Phase = 'intro' | 'question' | 'feedback' | 'result';

export function ListeningSession({ lessonId, sectionId, items, kind }: ListeningSessionProps) {
  const t = useTranslations('angol');
  const [round, setRound] = useState<MondatPair[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const evalOptions = { commaSeparatedAlternatives: kind === 'word' };

  const current = round[index];

  const play = useCallback((rate = TTS_RATE_NORMAL) => {
    if (current) speakEnglish(speakableEnglish(current.answer, kind), rate);
  }, [current, kind]);

  useEffect(() => () => stopSpeaking(), []);

  // Focus the answer field for each new question
  useEffect(() => {
    if (phase === 'question') inputRef.current?.focus();
  }, [phase, index]);

  const start = () => {
    const next = shuffleArray(items).slice(0, ROUND_SIZE);
    setRound(next);
    setIndex(0);
    setResults([]);
    setAnswer('');
    setResult(null);
    setPhase('question');
    // Called inside the tap handler, so iOS allows the first utterance
    if (next[0]) speakEnglish(speakableEnglish(next[0].answer, kind), TTS_RATE_NORMAL);
    void recordAngolActivity();
  };

  const check = () => {
    if (!current || phase !== 'question') return;
    const r = evaluateAnswer(answer, current.answer, evalOptions);
    setResult(r);
    setResults((prev) => [...prev, r]);
    setPhase('feedback');
    if (r !== 'correct') {
      void recordHardItems([{ lessonId, sectionId, kind, prompt: current.prompt, answer: current.answer }]);
    }
  };

  const next = () => {
    if (index + 1 >= round.length) {
      setPhase('result');
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setAnswer('');
    setResult(null);
    setPhase('question');
    speakEnglish(speakableEnglish(round[nextIndex].answer, kind), TTS_RATE_NORMAL);
  };

  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-xl space-y-5 text-center">
        <p className="text-sm text-muted-foreground">{t('listeningIntro', { count: Math.min(ROUND_SIZE, items.length) })}</p>
        <button
          type="button"
          onClick={start}
          className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
        >
          ▶ {t('listeningStart')}
        </button>
      </div>
    );
  }

  if (phase === 'result') {
    const correct = results.filter((r) => r === 'correct').length;
    const partial = results.filter((r) => r === 'partial').length;
    return (
      <div className="mx-auto max-w-md space-y-6 text-center animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-cream">{t('listeningResultTitle')}</h2>
        <div className="premium-card angol-surface p-8">
          <p className="font-display text-5xl font-bold text-cream">
            {correct}/{results.length}
          </p>
          {partial > 0 && <p className="mt-2 text-sm text-amber-300">{t('listeningPartial', { count: partial })}</p>}
          {correct < results.length && <p className="mt-4 text-xs text-muted-foreground">{t('listeningWrongSaved')}</p>}
        </div>
        <button type="button" onClick={start} className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90">
          {t('listeningAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{t('examQuestion', { current: index + 1, total: round.length })}</p>
        <div className="mt-2 flex gap-1">
          {round.map((_, i) => (
            <div key={i} className={cn('h-1.5 flex-1 rounded-full', i < index ? 'bg-primary' : i === index ? 'bg-accent' : 'bg-muted')} />
          ))}
        </div>
      </div>

      <div className="premium-card angol-surface space-y-5 p-6 sm:p-8">
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => play()} className="rounded-xl bg-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-600/60">
            🔊 {t('listeningReplay')}
          </button>
          <button type="button" onClick={() => play(TTS_RATE_SLOW)} className="rounded-xl bg-slate-700/30 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-600/50">
            🐢 {t('listeningSlower')}
          </button>
        </div>

        <div>
          <p className="mb-1 text-sm text-muted-foreground">{t('listeningTypeWhatYouHear')}</p>
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              if (phase === 'question') check();
              else next();
            }}
            disabled={phase !== 'question'}
            placeholder={t('answerPlaceholder')}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70"
          />
        </div>

        {phase === 'feedback' && current && result && (
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
            <p className="mt-2 text-green-300">{current.answer}</p>
            <p className="mt-1 text-muted-foreground">{current.prompt}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {phase === 'question' && <SpeechInput onResult={setAnswer} />}
          {phase === 'question' ? (
            <button type="button" onClick={check} className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90">
              {t('checkAnswer')}
            </button>
          ) : (
            <button type="button" onClick={next} className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90">
              {index + 1 >= round.length ? t('finishButton') : `${t('next')} →`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
