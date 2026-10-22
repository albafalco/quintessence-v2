import type { SupabaseClient } from '@supabase/supabase-js';
import { SESSION_KEYS, practiceDate } from './path';
import type { BodyItem, PathState } from './types';

/** A session of today (practice day) as the "Ma" page needs it. */
export interface TodaySession {
  exercise_key: string;
  started_at: string;
  outcome: 'igen' | 'reszben' | 'nem' | null;
  reps: number | null;
}

export interface TodayData {
  path: PathState;
  /** Practice day, 'YYYY-MM-DD' */
  today: string;
  sessions: TodaySession[];
  /** Completed evening self-examinations so far: the practice days */
  completedEvenings: number;
  /** Has the user practised this before (the Útravaló is shown before the first time)? */
  seen: { body: boolean; thought: boolean; breath: boolean };
}

const PATH_COLUMNS =
  'user_id, gate_read_at, fokozat, fokozat_started_at, wish, wish_set_at, thought_stage, thought_minutes, thought_wins, thought_fails, thought_raised_on, thought_focus, breath_target, breath_raised_on, body_plan';

export async function loadPath(supabase: SupabaseClient, userId: string): Promise<PathState | null> {
  const { data, error } = await supabase.from('magia_path').select(PATH_COLUMNS).eq('user_id', userId).maybeSingle();
  if (error) {
    console.error('[magia] path load failed', error.message);
    return null;
  }
  if (!data) return null;
  return { ...data, body_plan: (data.body_plan ?? []) as BodyItem[] } as PathState;
}

async function hasSession(supabase: SupabaseClient, userId: string, key: string, prefix = false): Promise<boolean> {
  const query = supabase.from('magia_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  const { count } = prefix ? await query.like('exercise_key', `${key}%`) : await query.eq('exercise_key', key);
  return (count ?? 0) > 0;
}

/** Everything the "Ma" page needs; null before the Gate (no path row yet). */
export async function loadTodayData(supabase: SupabaseClient, userId: string, now = new Date()): Promise<TodayData | null> {
  const path = await loadPath(supabase, userId);
  if (!path) return null;

  const today = practiceDate(now);
  // Today's sessions: the practice day can start up to a day and 4 hours ago
  const since = new Date(now.getTime() - 30 * 3_600_000).toISOString();

  const [sessionsRes, eveningsRes, seenBody, seenThought, seenBreath] = await Promise.all([
    supabase
      .from('magia_sessions')
      .select('exercise_key, started_at, outcome, reps')
      .eq('user_id', userId)
      .gte('started_at', since)
      .order('started_at', { ascending: true }),
    supabase
      .from('magia_evenings')
      .select('obs_date', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null),
    hasSession(supabase, userId, SESSION_KEYS.body(''), true),
    hasSession(supabase, userId, SESSION_KEYS.thought(Math.min(path.thought_stage, 2))),
    hasSession(supabase, userId, SESSION_KEYS.breath),
  ]);

  const sessions = ((sessionsRes.data ?? []) as TodaySession[]).filter((s) => practiceDate(s.started_at) === today);

  return {
    path,
    today,
    sessions,
    completedEvenings: eveningsRes.count ?? 0,
    seen: { body: seenBody, thought: seenThought, breath: seenBreath },
  };
}
