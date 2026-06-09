'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ProgressRing } from './ProgressRing';
import {
  ROMAN_NUMERALS,
  getSectionProgress,
  isFokozatUnlocked,
  type MagiaProgressRecord,
} from '@/lib/magia-utils';
import { cn } from '@/lib/utils';
import type { MagiaSection } from '@/lib/magia-types';

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
  mastered,
  total,
  color,
}: {
  label: string;
  mastered: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? (mastered / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className="text-cream/70">
          {mastered}/{total}
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
  const unlocked = isFokozatUnlocked(fokozat.id, progress);

  const sections = SECTIONS.map((section) => ({
    section,
    label: t(section),
    ...getSectionProgress(fokozat.id, section, progress),
  }));

  const totalMastered = sections.reduce((sum, s) => sum + s.mastered, 0);
  const totalExercises = sections.reduce((sum, s) => sum + s.total, 0);
  const overallPercent =
    totalExercises > 0
      ? Math.round((totalMastered / totalExercises) * 100)
      : 0;

  if (!unlocked) {
    return (
      <div
        className="group relative premium-card magia-surface block cursor-not-allowed p-6 opacity-45"
        title={`Feltétel: a ${fokozat.id - 1}. fokozat összes gyakorlatának uralása`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{ background: `${fokozat.szin}12`, border: `1px solid ${fokozat.szin}22` }}
            >
              🔒
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/50">
                {ROMAN_NUMERALS[fokozat.id]}. {t('fokozat')} — Zárolt
              </p>
              <h3
                className="font-display text-lg font-semibold opacity-60"
                style={{ color: fokozat.szin }}
              >
                {fokozat.cim}
              </h3>
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          A {fokozat.id - 1}. fokozat összes gyakorlatának uralása szükséges.
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/${locale}/modules/magia/fokozat/${fokozat.id}`}
      className="group relative premium-card-hover magia-surface block p-6"
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
        {sections.map(({ section, label, mastered, total }) => (
          <SectionBar
            key={section}
            label={label}
            mastered={mastered}
            total={total}
            color={fokozat.szin}
          />
        ))}
      </div>

      {overallPercent === 100 && (
        <div className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-accent/10 py-1.5 text-[11px] font-bold uppercase tracking-wider text-accent shadow-glow-gold">
          ★ Fokozat uralt
        </div>
      )}
    </Link>
  );
}
