'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MondatPair } from '@/lib/i18n-content';
import { scorePronunciation, shuffleArray, type PronunciationScore } from '@/lib/angol-utils';
import { speakEnglish, speakableEnglish, stopSpeaking } from '@/lib/tts';
import { recordAngolActivity } from '@/lib/angol-activity';
import { cn } from '@/lib/utils';

const ROUND_SIZE = 10;
const GOOD_SCORE = 80;
const CLOSE_SCORE = 50;

interface PronunciationSessionProps {
  items: MondatPair[];
  kind: 'sentence' | 'word';
}

type Availability = 'supported' | 'unsupported' | 'blocked';

export function PronunciationSession({ items, kind }: PronunciationSessionProps) {
  const t = useTranslations('angol');
  const [round, setRound] = useState<MondatPair[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [score, setScore] = useState<PronunciationScore | null>(null);
  const [best, setBest] = useState<number[]>([]);
  const [availability, setAvailability] = useState<Availability>('supported');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const current = round[index];
  const target = current ? speakableEnglish(current.answer, kind) : '';

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  const evaluate = useCallback(
    (transcript: string) => {
      const result = scorePronunciation(target, transcript);
      setHeard(transcript);
      setScore(result);
      setBest((prev) => {
        const next = [...prev];
        next[index] = Math.max(next[index] ?? 0, result.score);
        return next;
      });
    },
    [target, index]
  );

  const record = () => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    stopSpeaking();
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join(' ');
      evaluate(transcript.trim());
    };
    recognition.onerror = (event: Event) => {
      const code = (event as Event & { error?: string }).error;
      if (code === 'not-allowed' || code === 'service-not-allowed') setAvailability('blocked');
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setHeard('');
    setScore(null);
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const stop = () => recognitionRef.current?.stop();

  const start = () => {
    // Checked on tap (not on mount) so server and client render the same markup
    if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
      setAvailability('unsupported');
      return;
    }
    setRound(shuffleArray(items).slice(0, ROUND_SIZE));
    setIndex(0);
    setBest([]);
    setHeard('');
    setScore(null);
    setFinished(false);
    setStarted(true);
    void recordAngolActivity();
  };

  const next = () => {
    if (index + 1 >= round.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setHeard('');
    setScore(null);
  };

  if (availability === 'unsupported' || availability === 'blocked') {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border/40 bg-card/30 p-6 text-center text-sm text-muted-foreground">
        {availability === 'blocked' ? t('speechNotAllowed') : t('speechNotSupported')}
      </div>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-xl space-y-5 text-center">
        <p className="text-sm text-muted-foreground">{t('pronunciationIntro', { count: Math.min(ROUND_SIZE, items.length) })}</p>
        <button type="button" onClick={start} className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90">
          ▶ {t('listeningStart')}
        </button>
      </div>
    );
  }

  if (finished) {
    const attempted = best.filter((b) => b !== undefined);
    const avg = attempted.length ? Math.round(attempted.reduce((a, b) => a + b, 0) / attempted.length) : 0;
    return (
      <div className="mx-auto max-w-md space-y-6 text-center animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-cream">{t('pronunciationResultTitle')}</h2>
        <div className="premium-card angol-surface p-8">
          <p className="font-display text-5xl font-bold text-cream">{avg}%</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('pronunciationAverage', { count: attempted.length })}</p>
        </div>
        <button type="button" onClick={start} className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90">
          {t('listeningAgain')}
        </button>
      </div>
    );
  }

  const verdict =
    score == null ? null : score.score >= GOOD_SCORE ? 'good' : score.score >= CLOSE_SCORE ? 'close' : 'retry';

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
        <div className="text-center">
          {score ? (
            <p className="font-display text-2xl font-medium leading-relaxed">
              {score.words.map((w, i) => (
                <span key={i} className={w.matched ? 'text-green-300' : 'text-red-400 underline decoration-dotted underline-offset-4'}>
                  {w.text}{' '}
                </span>
              ))}
            </p>
          ) : (
            <p className="font-display text-2xl font-medium text-cream">{target}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">{current?.prompt}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => speakEnglish(target)} className="rounded-xl bg-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-600/60">
            🔊 {t('pronunciationListen')}
          </button>
          {listening ? (
            <button type="button" onClick={stop} className="rounded-xl bg-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/30">
              ■ {t('stopDictation')}
            </button>
          ) : (
            <button type="button" onClick={record} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              🎤 {score ? t('pronunciationTryAgain') : t('pronunciationSpeak')}
            </button>
          )}
        </div>

        {listening && <p className="text-center text-xs text-accent animate-pulse">{t('pronunciationListening')}</p>}

        {score && verdict && (
          <div
            className={cn(
              'rounded-xl border p-4 text-center text-sm',
              verdict === 'good' && 'border-green-500/30 bg-green-900/20',
              verdict === 'close' && 'border-amber-500/30 bg-amber-900/20',
              verdict === 'retry' && 'border-red-500/30 bg-red-900/20'
            )}
          >
            <p className="font-display text-3xl font-bold text-cream">{score.score}%</p>
            <p className="mt-1 font-semibold">
              {verdict === 'good' ? `${t('pronunciationGood')} ✦` : verdict === 'close' ? t('pronunciationClose') : t('pronunciationRetry')}
            </p>
            {heard && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t('pronunciationHeard')} „{heard}”
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button type="button" onClick={next} className="rounded-lg bg-muted px-5 py-2 text-sm hover:bg-muted/80">
            {index + 1 >= round.length ? t('finishButton') : `${t('next')} →`}
          </button>
        </div>
      </div>
    </div>
  );
}
