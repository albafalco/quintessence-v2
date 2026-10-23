import type { SupabaseClient } from '@supabase/supabase-js';
import { computeStreak } from '../magia-utils';
import { toBudapestDate } from '../push-reminders';
import { loadDaySummary, type DaySummary } from './store';

export interface PathData {
  day: DaySummary;
  streak: number;
}

/** Everything the Utam tab needs; null before the Gate. */
export async function loadPathData(supabase: SupabaseClient, userId: string): Promise<PathData | null> {
  const streakStart = new Date(Date.now() - 366 * 86_400_000).toISOString();
  const [day, streakRes] = await Promise.all([
    loadDaySummary(supabase, userId),
    supabase.from('magia_sessions').select('started_at, completed').eq('user_id', userId).eq('completed', true).gte('started_at', streakStart),
  ]);
  if (!day) return null;

  return {
    day,
    streak: computeStreak((streakRes.data ?? []) as { started_at: string; completed: boolean }[], toBudapestDate(new Date())),
  };
}
