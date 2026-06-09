'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen } from 'lucide-react';
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
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border/40 bg-muted/20 p-2">
        {TABS.map((tab, index) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 min-w-[120px]',
              activeTab === tab
                ? 'bg-primary/30 text-accent shadow-glow-gold'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-cream'
            )}
          >
            <span className="text-accent/60">{index + 1}.</span> {t(tab)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-gradient-gold">
          {current.cim}
        </h2>
        <button
          type="button"
          onClick={() =>
            document.getElementById('journal')?.scrollIntoView({ behavior: 'smooth' })
          }
          className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent transition-all hover:bg-accent/20 hover:shadow-glow-gold"
        >
          <BookOpen className="h-4 w-4" />
          {t('journal')}
        </button>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-magia-gradient p-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream/90">
          {current.leiras}
        </p>
      </div>

      <div>
        <h3 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent/70">
          <span className="h-px flex-1 bg-gradient-to-r from-accent/40 to-transparent" />
          {t('exercises')}
          <span className="h-px flex-1 bg-gradient-to-l from-accent/40 to-transparent" />
        </h3>
        <div className="space-y-4">
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