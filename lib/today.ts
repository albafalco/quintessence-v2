import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from '@/i18n';
import { loadMagiaFokozatok } from '@/lib/i18n-content';
import { buildDailyPlan } from '@/lib/magia-plan';
import { computeStreak, getCurrentFokozatId, type MagiaProgressRecord } from '@/lib/magia-utils';
import { getBudapestDayBounds, toBudapestDate } from '@/lib/push-reminders';
import { isSunday } from '@/lib/weekly-report';
import { hasModuleAccess } from '@/lib/module-access';
import { loadDaySummary, type DaySummary } from '@/lib/magia/store';
import { dayTasks, fokozatIConditions, unlockedExercises, type DayTaskKey } from '@/lib/magia/path';
import { isCycleReady } from '@/lib/magia/mirror';
import type { DayPart } from '@/lib/magia/types';

export interface TodayPlanItem {
  /** Exercise title (current module) */
  title?: string;
  slot?: 0 | 1;
  /** New Fehér Mágia path: the task and its part of the day, translated by the card */
  task?: DayTaskKey | 'gate';
  part?: DayPart;
  done: boolean;
}

/** New Fehér Mágia path: where the fokozat stands */
export interface PathProgress {
  fokozat: number;
  percent: number;
  /** The 14 evenings are done: the cycle can be closed on the Tükör tab */
  cycleReady: boolean;
}

export interface TodayData {
  items: TodayPlanItem[];
  streak: number;
  hardCount: number;
  isSunday: boolean;
  /** Only on the new path (admin preview until the switch) */
  path?: PathProgress;
}

// One RPC per check; the browser keeps a granted access for the session
const grantedNewPath = new Set<string>();

async function usesNewPath(supabase: SupabaseClient, userId: string): Promise<boolean> {
  if (grantedNewPath.has(userId)) return true;
  const granted = await hasModuleAccess(supabase, 'feher_magia');
  if (granted) grantedNewPath.add(userId);
  return granted;
}

/** Today's tasks and the fokozat percent of the new path (only the Gate before it is read). */
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

/** Data of the dashboard "Mai teendők" card (same plan as the "Ma" page). */
export async function loadTodayData(
  supabase: SupabaseClient,
  userId: string,
  locale: Locale,
  progress: MagiaProgressRecord[],
  withAngol: boolean
): Promise<TodayData> {
  const today = toBudapestDate(new Date());
  const { start } = getBudapestDayBounds(today);
  const streakStart = new Date(Date.now() - 366 * 86_400_000).toISOString();
  const newPath = await usesNewPath(supabase, userId);

  const [fokozatok, todayRes, streakRes, hardRes, day] = await Promise.all([
    loadMagiaFokozatok(locale),
    supabase.from('magia_sessions').select('exercise_key').eq('user_id', userId).gte('started_at', start),
    supabase
      .from('magia_sessions')
      .select('started_at, completed')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('started_at', streakStart),
    withAngol
      ? supabase.from('angol_hard_items').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      : Promise.resolve({ count: 0, error: null }),
    newPath ? loadDaySummary(supabase, userId) : Promise.resolve(null),
  ]);

  const streak = computeStreak((streakRes.data ?? []) as { started_at: string; completed: boolean }[], today);
  const hardCount = hardRes.error ? 0 : (hardRes.count ?? 0);

  if (newPath) {
    // No weekly report on the new path: the 14-day close replaces it
    return { ...newPathToday(day), streak, hardCount, isSunday: false };
  }

  const fokozat = fokozatok.find((f) => f.id === getCurrentFokozatId(progress)) ?? fokozatok[0];
  const plan = buildDailyPlan(
    fokozat,
    progress,
    ((todayRes.data ?? []) as { exercise_key: string }[]).map((s) => s.exercise_key)
  );

  return {
    items: plan.map((p) => ({ title: p.exercise.cim, slot: p.slot, done: p.doneToday })),
    streak,
    hardCount,
    isSunday: isSunday(today),
  };
}
