'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExerciseItem } from './ExerciseItem';
import {
  getExerciseProgress,
  type MagiaProgressRecord,
} from '@/lib/magia-utils';
import { cn } from '@/lib/utils';
import type { MagiaSection } from '@/lib/magia-data';

interface Exercise {
  key: string;
  cim: string;
  leiras: string;
}

interface SectionData {
  cim: string;
  leiras: string;
  gyakorlatok: Exercise[];
}

interface FokozatTabsProps {
  fokozatId: number;
  szellem: SectionData;
  lelek: SectionData;
  test: SectionData;
  progress: MagiaProgressRecord[];
  userId: string;
}

const TABS: MagiaSection[] = ['szellem', 'lelek', 'test'];

export function FokozatTabs({
  fokozatId,
  szellem,
  lelek,
  test,
  progress,
  userId,
}: FokozatTabsProps) {
  const t = useTranslations('magia');
  const [activeTab, setActiveTab] = useState<MagiaSection>('szellem');

  const sectionData: Record<MagiaSection, SectionData> = {
    szellem,
    lelek,
    test,
  };

  const current = sectionData[activeTab];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((tab, index) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            {index + 1}. {t(tab)}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {current.cim}
        </h2>
        <button
          type="button"
          onClick={() =>
            document
              .getElementById('journal')
              ?.scrollIntoView({ behavior: 'smooth' })
          }
          className="shrink-0 rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
        >
          + {t('journal')}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card/30 p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {current.leiras}
        </p>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('exercises')}
        </h3>
        <div className="space-y-3">
          {current.gyakorlatok.map((exercise) => {
            const exerciseProgress = getExerciseProgress(
              fokozatId,
              activeTab,
              exercise.key,
              progress
            );

            return (
              <ExerciseItem
                key={exercise.key}
                fokozatId={fokozatId}
                section={activeTab}
                exerciseKey={exercise.key}
                title={exercise.cim}
                description={exercise.leiras}
                initialCompleted={exerciseProgress.completed}
                initialNotes={exerciseProgress.notes}
                userId={userId}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}