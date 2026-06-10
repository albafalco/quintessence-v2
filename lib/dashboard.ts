import type { FokozatData } from '@/lib/i18n-content';
import magiaStructure from '@/messages/content/magia.hu.json';
import vocabulary from '@/messages/content/angol-vocabulary.json';
import { getFokozatExerciseCount } from '@/lib/i18n-content';

const MAGIA_STRUCTURE = magiaStructure as FokozatData[];
const VOCABULARY = vocabulary as { prompt: string; answer: string }[];

export function getFokozatExerciseCountFromStructure(fokozatId: number): number {
  const fokozat = MAGIA_STRUCTURE.find((f) => f.id === fokozatId);
  if (!fokozat) return 0;
  return getFokozatExerciseCount(fokozat);
}

export function getTotalMagiaExercisesFromStructure(): number {
  return MAGIA_STRUCTURE.reduce((sum, f) => sum + getFokozatExerciseCount(f), 0);
}

interface MagiaProgressRow {
  fokozat: number;
  completed: boolean;
  completed_at: string | null;
}

export function getMagiaDashboardStats(progress: MagiaProgressRow[]) {
  const completedRows = progress.filter((p) => p.completed);
  const currentFokozat =
    completedRows.length > 0
      ? Math.max(...completedRows.map((p) => p.fokozat))
      : 1;

  const fokozatTotal = getFokozatExerciseCountFromStructure(currentFokozat);
  const fokozatCompleted = completedRows.filter((p) => p.fokozat === currentFokozat).length;
  const fokozatPercent = fokozatTotal > 0 ? Math.round((fokozatCompleted / fokozatTotal) * 100) : 0;

  const overallTotal = getTotalMagiaExercisesFromStructure();
  const overallPercent =
    overallTotal > 0 ? Math.round((completedRows.length / overallTotal) * 100) : 0;

  const lastActivity = completedRows
    .map((p) => p.completed_at)
    .filter(Boolean)
    .sort()
    .reverse()[0] ?? null;

  return {
    currentFokozat,
    fokozatPercent,
    overallPercent,
    lastActivity,
  };
}

interface AngolCardRow {
  correct_count: number;
  last_seen: string | null;
}

interface AngolUnlockRow {
  section_id: number;
  unlocked_at: string;
}

const TOTAL_ANGOL_SECTIONS = 17;

export function getAngolDashboardStats(
  cards: AngolCardRow[],
  unlocks: AngolUnlockRow[]
) {
  const learnedCards = cards.filter((c) => c.correct_count >= 3).length;
  const cardPercent = VOCABULARY.length > 0 ? Math.round((learnedCards / VOCABULARY.length) * 100) : 0;

  const unlockedSections = unlocks.length;
  const sectionPercent = Math.round((unlockedSections / TOTAL_ANGOL_SECTIONS) * 100);

  const progress = Math.round((cardPercent + sectionPercent) / 2);

  const lastCard = cards
    .map((c) => c.last_seen)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const lastUnlock = unlocks
    .map((u) => u.unlocked_at)
    .sort()
    .reverse()[0];

  const lastActivity =
    [lastCard, lastUnlock].filter(Boolean).sort().reverse()[0] ?? null;

  return {
    progress,
    lastActivity,
  };
}

export function formatActivityDate(dateStr: string | null, locale: string): string | null {
  if (!dateStr) return null;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr));
}