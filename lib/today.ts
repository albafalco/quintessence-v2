import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from '@/i18n';
import { loadMagiaFokozatok } from '@/lib/i18n-content';
import { buildDailyPlan } from '@/lib/magia-plan';
import { computeStreak, getCurrentFokozatId, type MagiaProgressRecord } from '@/lib/magia-utils';
import { getBudapestDayBounds, toBudapestDate } from '@/lib/push-reminders';
import { isSunday } from '@/lib/weekly-report';

export interface TodayPlanItem {
  title: string;
  slot?: 0 | 1;
  done: boolean;
}

export interface TodayData {
  items: TodayPlanItem[];
  streak: number;
  hardCount: number;
  isSunday: boolean;
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

  const [fokozatok, todayRes, streakRes, hardRes] = await Promise.all([
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
  ]);

  const fokozat = fokozatok.find((f) => f.id === getCurrentFokozatId(progress)) ?? fokozatok[0];
  const plan = buildDailyPlan(
    fokozat,
    progress,
    ((todayRes.data ?? []) as { exercise_key: string }[]).map((s) => s.exercise_key)
  );

  return {
    items: plan.map((p) => ({ title: p.exercise.cim, slot: p.slot, done: p.doneToday })),
    streak: computeStreak((streakRes.data ?? []) as { started_at: string; completed: boolean }[], today),
    hardCount: hardRes.error ? 0 : (hardRes.count ?? 0),
    isSunday: isSunday(today),
  };
}
