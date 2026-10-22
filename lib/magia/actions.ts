'use client';

import { createClient } from '@/lib/supabase/client';
import { toBudapestDate } from '@/lib/push-reminders';
import type { PathState } from './types';

type PathUpdate = Partial<Omit<PathState, 'user_id'>>;

/** Saves part of the path state (the row exists after the Gate). */
export async function updatePath(userId: string, update: PathUpdate): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('magia_path')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}

export interface NewSession {
  section: 'szellem' | 'lelek' | 'test';
  exerciseKey: string;
  fokozat: number;
  startedAt: string;
  durationSec?: number | null;
  targetSec?: number | null;
  outcome?: 'igen' | 'reszben' | 'nem' | null;
  reps?: number | null;
}

/** Records a practice; it feeds the streak, the badges and the reminders as before. */
export async function saveSession(userId: string, s: NewSession): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('magia_sessions')
    .insert({
      user_id: userId,
      fokozat: s.fokozat,
      section: s.section,
      exercise_key: s.exerciseKey,
      started_at: s.startedAt,
      ended_at: new Date().toISOString(),
      duration_sec: s.durationSec ?? null,
      target_sec: s.targetSec ?? null,
      completed: true,
      outcome: s.outcome ?? null,
      reps: s.reps ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  // The streak reminder and the re-engagement push read this date
  await supabase.from('profiles').update({ last_magia_activity_date: toBudapestDate(new Date()) }).eq('id', userId);
  return data?.id ?? null;
}

/** Unticks a checklist item: removes today's session of that key. */
export async function deleteSessionsSince(userId: string, exerciseKey: string, sinceIso: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('magia_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('exercise_key', exerciseKey)
    .gte('started_at', sinceIso);
  if (error) throw error;
}
