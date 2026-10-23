import type { SupabaseClient } from '@supabase/supabase-js';
import { computeStreak } from '@/lib/magia-utils';
import { toBudapestDate } from '@/lib/push-reminders';
import { loadDaySummary, type DaySummary } from '@/lib/magia/store';
import { dayTasks, fokozatIConditions, unlockedExercises, type DayTaskKey } from '@/lib/magia/path';
import { isCycleReady } from '@/lib/magia/mirror';
import type { DayPart } from '@/lib/magia/types';

export interface TodayPlanItem {
  /** The task and its part of the day, translated by the card */
  task: DayTaskKey | 'gate';
  part?: DayPart;
  done: boolean;
}

/** Where the fokozat stands */
export interface PathProgress {
  fokozat: number;
  percent: number;
  /** The 14 evenings are done: the cycle can be closed on the Tükör tab */
  cycleReady: boolean;
}

export interface TodayData {
  items: TodayPlanItem[];
  streak: number;
  path: PathProgress;
}

/** Today's tasks and the fokozat percent (only the Gate before it is read). */
export function newPathToday(day: DaySummary | null): { items: TodayPlanItem[]; path: PathProgress } {
  if (!day) return { items: [{ task: 'gate', done: false }], path: { fokozat: 1, percent: 0, cycleReady: false } };
  const { path } = day;
  const items: TodayPlanItem[] = dayTasks({
    bodyPlan: path.body_plan,
    thoughtStage: path.thought_stage,
    today: day.today,
    sessions: day.sessions,
    unlocked: unlockedExercises(day.completedEvenings),
    eveningDone: day.eveningDone,
  }).map((t) => ({ task: t.key, part: t.part, done: t.done }));
  // Before the first choice of body-training items
  if (path.body_plan.length === 0) items.unshift({ task: 'body', part: 'reggel', done: false });

  const { percent } = fokozatIConditions({
    gateRead: Boolean(path.gate_read_at),
    thoughtStage: path.thought_stage,
    thoughtMinutes: path.thought_minutes,
    thoughtWins: path.thought_wins,
    closedCycles: day.closedCycles,
    openCycleDays: day.openCycle?.days,
    openCycleLength: day.openCycle?.length,
  });
  const cycleReady = Boolean(day.openCycle && isCycleReady(day.openCycle.days, day.openCycle.length));
  return { items, path: { fokozat: path.fokozat, percent: path.fokozat === 1 ? percent : 0, cycleReady } };
}

/** Data of the dashboard "Mai teendők" card and the header chip (same plan as the "Ma" page). */
export async function loadTodayData(supabase: SupabaseClient, userId: string): Promise<TodayData> {
  const today = toBudapestDate(new Date());
  const streakStart = new Date(Date.now() - 366 * 86_400_000).toISOString();

  const [streakRes, day] = await Promise.all([
    supabase
      .from('magia_sessions')
      .select('started_at, completed')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('started_at', streakStart),
    loadDaySummary(supabase, userId),
  ]);

  const streak = computeStreak((streakRes.data ?? []) as { started_at: string; completed: boolean }[], today);
  return { ...newPathToday(day), streak };
}
