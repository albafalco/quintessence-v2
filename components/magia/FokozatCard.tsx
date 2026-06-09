'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ProgressRing } from './ProgressRing';
import {
  ROMAN_NUMERALS,
  getSectionProgress,
  type MagiaProgressRecord,
} from '@/lib/magia-utils';
import { cn } from '@/lib/utils';
import type { MagiaSection } from '@/lib/magia-data';

interface FokozatData {
  id: number;
  cim: string;
  rovidcim: string;
  icon: string;
  szin: string;
}

interface FokozatCardProps {
  fokozat: FokozatData;
  locale: string;
  progress: MagiaProgressRecord[];
}

const SECTIONS: MagiaSection[] = ['szellem', 'lelek', 'test'];

function SectionBar({
  label,
  completed,
  total,
  color,
}: {
  label: string;
  completed: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {completed}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function FokozatCard({ fokozat, locale, progress }: FokozatCardProps) {
  const t = useTranslations('magia');
  const isMuted = fokozat.id > 1;

  const sections = SECTIONS.map((section) => ({
    section,
    label: t(section),
    ...getSectionProgress(fokozat.id, section, progress),
  }));

  const totalCompleted = sections.reduce((sum, s) => sum + s.completed, 0);
  const totalExercises = sections.reduce((sum, s) => sum + s.total, 0);
  const overallPercent =
    totalExercises > 0
      ? Math.round((totalCompleted / totalExercises) * 100)
      : 0;

  return (
    <Link
      href={`/${locale}/modules/magia/fokozat/${fokozat.id}`}
      className={cn(
        'group block rounded-xl border border-border bg-card p-5 transition-all duration-300',
        'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
        isMuted && 'opacity-60 hover:opacity-90'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl" role="img" aria-hidden>
            {fokozat.icon}
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {ROMAN_NUMERALS[fokozat.id]}. {t('fokozat')}
            </p>
            <h3
              className="font-display text-lg font-semibold text-foreground"
              style={{ color: fokozat.szin }}
            >
              {fokozat.cim}
            </h3>
          </div>
        </div>
        <ProgressRing
          progress={overallPercent}
          color={fokozat.szin}
          size={56}
          strokeWidth={3}
        />
      </div>

      <div className="mt-4 space-y-2">
        {sections.map(({ section, label, completed, total }) => (
          <SectionBar
            key={section}
            label={label}
            completed={completed}
            total={total}
            color={fokozat.szin}
          />
        ))}
      </div>
    </Link>
  );
}