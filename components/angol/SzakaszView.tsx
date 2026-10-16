'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AngolGrammarContent, AngolSzakasz, MondatPair } from '@/lib/i18n-content';
import { GrammarContent } from '@/components/angol/GrammarRenderer';
import { VocabularyTrainer } from '@/components/angol/VocabularyTrainer';
import { PracticeSession } from '@/components/angol/PracticeSession';
import { ExamSession } from '@/components/angol/ExamSession';
import { ListeningSession } from '@/components/angol/ListeningSession';
import { PronunciationSession } from '@/components/angol/PronunciationSession';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/AppIcon';

interface SzakaszViewProps {
  lessonId: number;
  sectionId: number;
  sectionName: string;
  szakasz?: AngolSzakasz;
  locale: string;
  vocabulary: MondatPair[];
  grammar: AngolGrammarContent;
  lastExamScore?: number | null;
  lastExamPassed?: boolean;
}

type Mode = 'cards' | 'listening' | 'speaking' | 'exam';

export function SzakaszView({
  lessonId,
  sectionId,
  sectionName,
  szakasz,
  locale,
  vocabulary,
  grammar,
  lastExamScore,
  lastExamPassed,
}: SzakaszViewProps) {
  const t = useTranslations('angol');
  const [mode, setMode] = useState<Mode>('cards');

  if (sectionId === 1 || sectionId === 2) {
    return (
      <div className="max-w-3xl">
        <GrammarContent content={grammar} sectionId={sectionId} />
      </div>
    );
  }

  const isVocabulary = sectionId === 0;
  if (!isVocabulary && !szakasz) {
    return <p className="text-muted-foreground">{t('sectionNotFound')}</p>;
  }

  const items = isVocabulary ? vocabulary : szakasz!.mondatok;
  const kind = isVocabulary ? ('word' as const) : ('sentence' as const);
  const title = isVocabulary ? t('vocabulary') : sectionName;

  const MODES: { id: Mode; label: string; icon?: string }[] = [
    { id: 'cards', label: t('modeCards') },
    { id: 'listening', label: t('modeListening'), icon: 'headphones' },
    { id: 'speaking', label: t('modeSpeaking'), icon: 'mic' },
    { id: 'exam', label: t('exam') },
  ];

  return (
    <div className="space-y-6">
      <div className="mx-auto flex max-w-xl gap-1 rounded-2xl border border-border/40 bg-muted/20 p-1" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'min-w-0 flex-1 truncate rounded-xl px-2 py-2 text-xs font-medium transition-all sm:text-sm',
              mode === m.id ? 'bg-primary/30 text-slate-100 shadow-sm' : 'text-muted-foreground hover:bg-muted/40 hover:text-cream'
            )}
          >
            {m.icon && <AppIcon name={m.icon} className="mr-1 h-3.5 w-3.5 align-[-2px] text-current" />}
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'exam' && (
        <ExamSession
          lessonId={lessonId}
          sectionId={sectionId}
          sectionName={title}
          mondatok={items}
          locale={locale}
          onClose={() => setMode('cards')}
        />
      )}

      {mode === 'listening' && <ListeningSession lessonId={lessonId} sectionId={sectionId} items={items} kind={kind} />}

      {mode === 'speaking' && <PronunciationSession items={items} kind={kind} />}

      {mode === 'cards' &&
        (isVocabulary ? (
          <VocabularyTrainer lessonId={lessonId} vocabulary={vocabulary} onStartExam={() => setMode('exam')} />
        ) : (
          <PracticeSession
            sectionId={sectionId}
            sectionName={sectionName}
            mondatok={szakasz!.mondatok}
            onStartExam={() => setMode('exam')}
            lastExamScore={lastExamScore}
            lastExamPassed={lastExamPassed}
          />
        ))}
    </div>
  );
}
