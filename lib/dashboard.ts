import { MAGIA_FOKOZATOK } from '@/lib/magia-data';
import { SZOLAP_1 } from '@/lib/angol-szolap';

export function getFokozatExerciseCount(fokozatId: number): number {
  const fokozat = MAGIA_FOKOZATOK.find((f) => f.id === fokozatId);
  if (!fokozat) return 0;
  return (
    fokozat.szellem.gyakorlatok.length +
    fokozat.lelek.gyakorlatok.length +
    fokozat.test.gyakorlatok.length
  );
}

export function getTotalMagiaExercises(): number {
  return MAGIA_FOKOZATOK.reduce((sum, f) => sum + getFokozatExerciseCount(f.id), 0);
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

  const fokozatTotal = getFokozatExerciseCount(currentFokozat);
  const fokozatCompleted = completedRows.filter((p) => p.fokozat === currentFokozat).length;
  const fokozatPercent = fokozatTotal > 0 ? Math.round((fokozatCompleted / fokozatTotal) * 100) : 0;

  const overallTotal = getTotalMagiaExercises();
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
    progressLabel: `Fokozat ${currentFokozat}`,
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

const TOTAL_ANGOL_SECTIONS = 17; // sections 0-2 + 5-18

export function getAngolDashboardStats(
  cards: AngolCardRow[],
  unlocks: AngolUnlockRow[]
) {
  const learnedCards = cards.filter((c) => c.correct_count >= 3).length;
  const cardPercent = SZOLAP_1.length > 0 ? Math.round((learnedCards / SZOLAP_1.length) * 100) : 0;

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
    progressLabel: '1. Lecke',
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