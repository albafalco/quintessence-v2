import { MAGIA_FOKOZATOK, type MagiaSection } from './magia-data';

export const ROMAN_NUMERALS = [
  '',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
] as const;

export function buildExerciseKey(
  section: MagiaSection,
  fokozat: number,
  key: string
): string {
  return `${section}_${fokozat}_${key}`;
}

export interface MagiaProgressRecord {
  fokozat: number;
  section: MagiaSection;
  exercise_key: string;
  completed: boolean;
  notes: string | null;
}

export function getExerciseCount(fokozatId: number, section: MagiaSection): number {
  const fokozat = MAGIA_FOKOZATOK.find((f) => f.id === fokozatId);
  if (!fokozat) return 0;
  return fokozat[section].gyakorlatok.length;
}

export function getSectionProgress(
  fokozatId: number,
  section: MagiaSection,
  progress: MagiaProgressRecord[]
): { completed: number; total: number; percent: number } {
  const total = getExerciseCount(fokozatId, section);
  const completed = progress.filter(
    (p) => p.fokozat === fokozatId && p.section === section && p.completed
  ).length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function getFokozatProgress(
  fokozatId: number,
  progress: MagiaProgressRecord[]
): { completed: number; total: number; percent: number } {
  const sections: MagiaSection[] = ['szellem', 'lelek', 'test'];
  let completed = 0;
  let total = 0;

  for (const section of sections) {
    const sectionProgress = getSectionProgress(fokozatId, section, progress);
    completed += sectionProgress.completed;
    total += sectionProgress.total;
  }

  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function getExerciseProgress(
  fokozatId: number,
  section: MagiaSection,
  exerciseKey: string,
  progress: MagiaProgressRecord[]
): { completed: boolean; notes: string } {
  const fullKey = buildExerciseKey(section, fokozatId, exerciseKey);
  const record = progress.find(
    (p) =>
      p.fokozat === fokozatId &&
      p.section === section &&
      p.exercise_key === fullKey
  );
  return {
    completed: record?.completed ?? false,
    notes: record?.notes ?? '',
  };
}