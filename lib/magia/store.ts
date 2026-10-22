import type { SupabaseClient } from '@supabase/supabase-js';
import type { AddedTrait } from './evening';
import { SESSION_KEYS, practiceDate } from './path';
import type { BodyItem, PathState, Ratings } from './types';

/** A session of today (practice day) as the "Ma" page needs it. */
export interface TodaySession {
  exercise_key: string;
  started_at: string;
  outcome: 'igen' | 'reszben' | 'nem' | null;
  reps: number | null;
}

/** A trait the user added: a dictionary word (by key) or an own word (by name). */
export type UserTrait = AddedTrait;

export interface CycleRow {
  id: string;
  number: number;
  fokozat: number;
  length_days: number;
  started_on: string;
  closed_at: string | null;
}

export interface EveningRow {
  obs_date: string;
  cycle_id: string | null;
  ratings: Ratings;
  /** 0 = not started, 1 = recall done, 1 + n = n cards done */
  step: number;
  completed_at: string | null;
}

export interface TodayData {
  path: PathState;
  /** Practice day, 'YYYY-MM-DD' */
  today: string;
  sessions: TodaySession[];
  /** Completed evening self-examinations so far: the practice days */
  completedEvenings: number;
  /** Has the user practised this before (the Útravaló is shown before the first time)? */
  seen: { body: boolean; thought: boolean; breath: boolean; selfExam: boolean; meal: boolean; water: boolean };
  userTraits: UserTrait[];
  /** The open 14-day cycle, if any (the first evening opens one) */
  cycle: CycleRow | null;
  /** Number of the latest cycle, open or closed (0 = none yet) */
  lastCycleNumber: number;
  /** Ratings of the cycle's completed evenings before today, oldest first */
  cycleEvenings: Ratings[];
  /** Tonight's self-examination, if started */
  evening: EveningRow | null;
  /** Trait keys noted with "+" today */
  noteKeys: string[];
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

  const [sessionsRes, eveningsCount, cycleRes, traitsRes, notesRes, seenBody, seenThought, seenBreath, seenSelf, seenMeal, seenWater] =
    await Promise.all([
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
      supabase
        .from('magia_cycles')
        .select('id, number, fokozat, length_days, started_on, closed_at')
        .eq('user_id', userId)
        .order('number', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('magia_user_traits').select('id, mirror, trait_key, name, element').eq('user_id', userId).order('created_at'),
      supabase.from('magia_day_notes').select('trait_key').eq('user_id', userId).eq('obs_date', today),
      hasSession(supabase, userId, SESSION_KEYS.body(''), true),
      hasSession(supabase, userId, SESSION_KEYS.thought(Math.min(path.thought_stage, 2))),
      hasSession(supabase, userId, SESSION_KEYS.breath),
      hasSession(supabase, userId, SESSION_KEYS.selfExam),
      hasSession(supabase, userId, SESSION_KEYS.meal),
      hasSession(supabase, userId, SESSION_KEYS.water),
    ]);

  const sessions = ((sessionsRes.data ?? []) as TodaySession[]).filter((s) => practiceDate(s.started_at) === today);
  const openCycle = cycleRes.data && !cycleRes.data.closed_at ? (cycleRes.data as CycleRow) : null;

  // The open cycle's evenings: the completed ones before today, and tonight's
  let cycleEvenings: Ratings[] = [];
  let evening: EveningRow | null = null;
  const tonightRes = await supabase
    .from('magia_evenings')
    .select('obs_date, cycle_id, ratings, step, completed_at')
    .eq('user_id', userId)
    .eq('obs_date', today)
    .maybeSingle();
  evening = (tonightRes.data as EveningRow | null) ?? null;
  if (openCycle) {
    const { data } = await supabase
      .from('magia_evenings')
      .select('obs_date, ratings')
      .eq('user_id', userId)
      .eq('cycle_id', openCycle.id)
      .not('completed_at', 'is', null)
      .lt('obs_date', today)
      .order('obs_date');
    cycleEvenings = ((data ?? []) as { ratings: Ratings }[]).map((e) => e.ratings ?? {});
  }

  return {
    path,
    today,
    sessions,
    completedEvenings: eveningsCount.count ?? 0,
    seen: { body: seenBody, thought: seenThought, breath: seenBreath, selfExam: seenSelf, meal: seenMeal, water: seenWater },
    userTraits: (traitsRes.data ?? []) as UserTrait[],
    cycle: openCycle,
    lastCycleNumber: (cycleRes.data as CycleRow | null)?.number ?? 0,
    cycleEvenings,
    evening,
    noteKeys: ((notesRes.data ?? []) as { trait_key: string }[]).map((n) => n.trait_key),
  };
}
