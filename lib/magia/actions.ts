'use client';

import { createClient } from '@/lib/supabase/client';
import { toBudapestDate } from '@/lib/push-reminders';
import type { ElementType } from '../magia-types';
import type { AddedTrait } from './evening';
import type { PathState, Ratings } from './types';

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

/** Opens the next 14-day cycle (the first evening of a cycle does this); returns its id. */
export async function openCycle(userId: string, number: number, fokozat: number, startedOn: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('magia_cycles')
    .insert({ user_id: userId, kind: fokozat === 1 ? 'onismeret' : 'munka', number, fokozat, started_on: startedOn })
    .select('id')
    .single();
  if (!error && data) return data.id as string;
  // Opened meanwhile (another tab): use that one
  const { data: existing } = await supabase
    .from('magia_cycles')
    .select('id')
    .eq('user_id', userId)
    .eq('number', number)
    .maybeSingle();
  if (existing) return existing.id as string;
  throw error;
}

/** Saves tonight's self-examination after every card, so an interrupted evening can go on later. */
export async function saveEvening(
  userId: string,
  e: { obsDate: string; cycleId: string; ratings: Ratings; step: number; completed?: boolean }
): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from('magia_evenings').upsert(
    {
      user_id: userId,
      obs_date: e.obsDate,
      cycle_id: e.cycleId,
      ratings: e.ratings,
      step: e.step,
      updated_at: now,
      ...(e.completed ? { completed_at: now } : {}),
    },
    { onConflict: 'user_id,obs_date' }
  );
  if (error) throw error;
}

/** Adds a dictionary word (by key) or an own word (by name) to the user's mirror. */
export async function addUserTrait(
  userId: string,
  t: { mirror: 'fekete' | 'feher'; traitKey?: string; name?: string; element: ElementType | null }
): Promise<AddedTrait> {
  const supabase = createClient();
  const row = {
    user_id: userId,
    mirror: t.mirror,
    trait_key: t.traitKey ?? null,
    name: t.traitKey ? null : (t.name ?? '').trim(),
    element: t.element,
  };
  const { data, error } = await supabase.from('magia_user_traits').insert(row).select('id, mirror, trait_key, name, element').single();
  if (!error && data) return data as AddedTrait;
  if (t.traitKey) {
    // Already added before
    const { data: existing } = await supabase
      .from('magia_user_traits')
      .select('id, mirror, trait_key, name, element')
      .eq('user_id', userId)
      .eq('trait_key', t.traitKey)
      .maybeSingle();
    if (existing) return existing as AddedTrait;
  }
  throw error;
}

/** A "+" note during the day: which trait showed up, and optionally what happened. */
export async function addDayNote(userId: string, obsDate: string, traitKey: string, note: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('magia_day_notes')
    .insert({ user_id: userId, obs_date: obsDate, trait_key: traitKey, note: note?.trim() || null });
  if (error) throw error;
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
