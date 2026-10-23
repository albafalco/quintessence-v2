/** Milestone badges: definitions and progress evaluation (no data access). */

export interface BadgeStats {
  sessionCount: number;
  longestStreak: number;
  totalPracticeSec: number;
  /** New Fehér Mágia path: mastered thought stages */
  masteredExercises: number;
  /** New path: fokozatok completed (the II. fokozat reached = 1) */
  masteredFokozatok: number;
  resolvedSoulMirror: number;
  /** New path: closed 14-day cycles, each with the two soul mirrors (null on the current module) */
  closedCycles: number | null;
  learnedWords: number;
  vocabularySize: number;
  passedExams: number;
  unlockedPracticeSections: number;
  practiceSectionCount: number;
}

export type BadgeCategory = 'magia' | 'angol';

export interface BadgeDefinition {
  id: string;
  /** AppIcon name */
  icon: string;
  category: BadgeCategory;
  /** Current value and target, used for the progress bar */
  progress: (s: BadgeStats) => { value: number; target: number };
}

export const BADGES: BadgeDefinition[] = [
  { id: 'first_session', icon: 'sparkles', category: 'magia', progress: (s) => ({ value: s.sessionCount, target: 1 }) },
  { id: 'streak_7', icon: 'flame', category: 'magia', progress: (s) => ({ value: s.longestStreak, target: 7 }) },
  { id: 'streak_30', icon: 'flame', category: 'magia', progress: (s) => ({ value: s.longestStreak, target: 30 }) },
  { id: 'streak_100', icon: 'flame', category: 'magia', progress: (s) => ({ value: s.longestStreak, target: 100 }) },
  { id: 'practice_10h', icon: 'hourglass', category: 'magia', progress: (s) => ({ value: Math.floor(s.totalPracticeSec / 3600), target: 10 }) },
  { id: 'first_mastered', icon: 'star', category: 'magia', progress: (s) => ({ value: s.masteredExercises, target: 1 }) },
  { id: 'first_fokozat', icon: 'crown', category: 'magia', progress: (s) => ({ value: s.masteredFokozatok, target: 1 }) },
  // New path: "Az első két lélektükör" (same id, the old "10 resolved items" until the switch)
  {
    id: 'soul_mirror_10',
    icon: 'mirror',
    category: 'magia',
    progress: (s) => (s.closedCycles === null ? { value: s.resolvedSoulMirror, target: 10 } : { value: s.closedCycles, target: 1 }),
  },
  { id: 'words_50', icon: 'book', category: 'angol', progress: (s) => ({ value: s.learnedWords, target: 50 }) },
  { id: 'words_all', icon: 'library', category: 'angol', progress: (s) => ({ value: s.learnedWords, target: s.vocabularySize }) },
  { id: 'first_exam', icon: 'graduation', category: 'angol', progress: (s) => ({ value: s.passedExams, target: 1 }) },
  { id: 'all_sections', icon: 'key', category: 'angol', progress: (s) => ({ value: s.unlockedPracticeSections, target: s.practiceSectionCount }) },
];

export function isEarned(badge: BadgeDefinition, stats: BadgeStats): boolean {
  const { value, target } = badge.progress(stats);
  return target > 0 && value >= target;
}

/** Longest run of consecutive calendar days (YYYY-MM-DD strings, any order). */
export function longestDayStreak(dates: string[]): number {
  const days = Array.from(new Set(dates)).sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of days) {
    const t = Date.parse(day + 'T00:00:00Z');
    run = prev !== null && t - prev === 86_400_000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}
