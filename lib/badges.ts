/** Milestone badges: definitions and progress evaluation (no data access). */

export interface BadgeStats {
  sessionCount: number;
  longestStreak: number;
  totalPracticeSec: number;
  /** Fehér Mágia: mastered thought stages */
  masteredExercises: number;
  /** Fokozatok completed (the II. fokozat reached = 1) */
  masteredFokozatok: number;
  /** Closed 14-day cycles, each with the two soul mirrors */
  closedCycles: number;
}

export interface BadgeDefinition {
  id: string;
  /** AppIcon name */
  icon: string;
  /** Current value and target, used for the progress bar */
  progress: (s: BadgeStats) => { value: number; target: number };
}

/** The stations of the Fehér Mágia path, then the streaks. Retired ids stay stored but are not shown. */
export const BADGES: BadgeDefinition[] = [
  { id: 'first_session', icon: 'sparkles', progress: (s) => ({ value: s.sessionCount, target: 1 }) },
  { id: 'first_mastered', icon: 'star', progress: (s) => ({ value: s.masteredExercises, target: 1 }) },
  // "Az első két lélektükör" (the id is kept from the earlier module's badge)
  { id: 'soul_mirror_10', icon: 'mirror', progress: (s) => ({ value: s.closedCycles, target: 1 }) },
  { id: 'first_fokozat', icon: 'crown', progress: (s) => ({ value: s.masteredFokozatok, target: 1 }) },
  { id: 'streak_7', icon: 'flame', progress: (s) => ({ value: s.longestStreak, target: 7 }) },
  { id: 'streak_30', icon: 'flame', progress: (s) => ({ value: s.longestStreak, target: 30 }) },
  { id: 'streak_100', icon: 'flame', progress: (s) => ({ value: s.longestStreak, target: 100 }) },
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
