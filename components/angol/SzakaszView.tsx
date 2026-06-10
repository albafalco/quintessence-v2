'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AngolGrammarContent, AngolSzakasz, MondatPair } from '@/lib/i18n-content';
import { GrammarContent } from '@/components/angol/GrammarRenderer';
import { FlashCard } from '@/components/angol/FlashCard';
import { PracticeSession } from '@/components/angol/PracticeSession';
import { ExamSession } from '@/components/angol/ExamSession';

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
  const [examMode, setExamMode] = useState(false);

  if (sectionId === 0) {
    if (examMode) {
      return (
        <ExamSession
          lessonId={lessonId}
          sectionId={0}
          sectionName={t('vocabulary')}
          mondatok={vocabulary}
          locale={locale}
          onClose={() => setExamMode(false)}
        />
      );
    }
    return (
      <FlashCard
        lessonId={lessonId}
        vocabulary={vocabulary}
        onStartExam={() => setExamMode(true)}
      />
    );
  }

  if (sectionId === 1 || sectionId === 2) {
    return (
      <div className="max-w-3xl">
        <GrammarContent content={grammar} sectionId={sectionId} />
      </div>
    );
  }

  if (!szakasz) {
    return <p className="text-muted-foreground">{t('sectionNotFound')}</p>;
  }

  if (examMode) {
    return (
      <ExamSession
        lessonId={lessonId}
        sectionId={sectionId}
        sectionName={sectionName}
        mondatok={szakasz.mondatok}
        locale={locale}
        onClose={() => setExamMode(false)}
      />
    );
  }

  return (
    <PracticeSession
      sectionId={sectionId}
      sectionName={sectionName}
      mondatok={szakasz.mondatok}
      onStartExam={() => setExamMode(true)}
      lastExamScore={lastExamScore}
      lastExamPassed={lastExamPassed}
    />
  );
}