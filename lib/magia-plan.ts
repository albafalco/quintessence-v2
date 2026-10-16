import type { FokozatData } from '@/lib/i18n-content';
import type { Exercise, MagiaSection } from '@/lib/magia-types';
import { buildExerciseKey, getExerciseProgress, type MagiaProgressRecord } from '@/lib/magia-utils';

export interface PlanExercise {
  section: MagiaSection;
  exercise: Exercise;
  progress: ReturnType<typeof getExerciseProgress>;
  doneToday: boolean;
  /** For twice-daily exercises: 0 = morning, 1 = evening. */
  slot?: 0 | 1;
}

/**
 * Today's practice plan of a fokozat: every not-yet-mastered exercise, twice
 * for twice-daily ones. Shared by the "Ma" page and the dashboard.
 */
export function buildDailyPlan(
  fokozat: FokozatData,
  progress: MagiaProgressRecord[],
  todaySessionKeys: string[]
): PlanExercise[] {
  const plan: PlanExercise[] = [];
  for (const section of ['szellem', 'lelek', 'test'] as const) {
    for (const exercise of fokozat[section].gyakorlatok) {
      const ep = getExerciseProgress(fokozat.id, section, exercise.key, progress);
      if (ep.status === 'mastered') continue;

      const fullKey = buildExerciseKey(section, fokozat.id, exercise.key);
      const todayCount = todaySessionKeys.filter((k) => k === fullKey).length;

      if (exercise.params?.frequency === 'twice_daily') {
        plan.push({ section, exercise, progress: ep, doneToday: todayCount >= 1, slot: 0 });
        plan.push({ section, exercise, progress: ep, doneToday: todayCount >= 2, slot: 1 });
      } else {
        plan.push({ section, exercise, progress: ep, doneToday: todayCount >= 1 });
      }
    }
  }
  return plan;
}
