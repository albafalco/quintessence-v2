'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Mondat, Szakasz } from '@/lib/angol-lecke1';
import { SZOLAP_1 } from '@/lib/angol-szolap';
import { getStaticContent } from '@/lib/angol-static-content';
import { FlashCard } from '@/components/angol/FlashCard';
import { PracticeSession } from '@/components/angol/PracticeSession';
import { ExamSession } from '@/components/angol/ExamSession';

interface SzakaszViewProps {
  lessonId: number;
  sectionId: number;
  sectionName: string;
  szakasz?: Szakasz;
  locale: string;
  lastExamScore?: number | null;
  lastExamPassed?: boolean;
}

export function SzakaszView({
  lessonId,
  sectionId,
  sectionName,
  szakasz,
  locale,
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
          mondatok={SZOLAP_1 as Mondat[]}
          locale={locale}
          onClose={() => setExamMode(false)}
        />
      );
    }
    return <FlashCard lessonId={lessonId} onStartExam={() => setExamMode(true)} />;
  }

  if (sectionId === 1 || sectionId === 2) {
    return <div className="max-w-3xl">{getStaticContent(sectionId)}</div>;
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
