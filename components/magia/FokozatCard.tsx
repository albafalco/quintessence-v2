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
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className="text-cream/70">
          {completed}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 8px ${color}44`,
          }}
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
        'group relative premium-card-hover magia-surface block p-6',
        isMuted && 'opacity-55 hover:opacity-85'
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-glow-gold"
            style={{ background: `${fokozat.szin}18`, border: `1px solid ${fokozat.szin}33` }}
          >
            {fokozat.icon}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">
              {ROMAN_NUMERALS[fokozat.id]}. {t('fokozat')}
            </p>
            <h3
              className="font-display text-lg font-semibold"
              style={{ color: fokozat.szin }}
            >
              {fokozat.cim}
            </h3>
          </div>
        </div>
        <ProgressRing
          progress={overallPercent}
          color={fokozat.szin}
          size={60}
          strokeWidth={3}
        />
      </div>

      <div className="mt-5 space-y-2.5">
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