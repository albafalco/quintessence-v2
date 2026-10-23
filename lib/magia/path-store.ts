import type { SupabaseClient } from '@supabase/supabase-js';
import type { ElementType, SoulMirrorType } from '../magia-types';
import { computeStreak } from '../magia-utils';
import { toBudapestDate } from '../push-reminders';
import { loadDaySummary, type DaySummary } from './store';

/** An entry of the former module's journal (read-only on the Utam tab) */
export interface OldJournalEntry {
  id: string;
  entry_date: string;
  content: string | null;
  successes?: string | null;
  failures?: string | null;
  disturbances?: string | null;
  self_criticism?: string | null;
  next_plan?: string | null;
}

/** An item of the former module's soul mirror (read-only) */
export interface OldMirrorItem {
  id: string;
  mirror: SoulMirrorType;
  trait: string;
  element: ElementType | null;
  intensity: number;
  resolved: boolean;
}

export interface PathData {
  day: DaySummary;
  streak: number;
  journal: OldJournalEntry[];
  oldMirror: OldMirrorItem[];
}

/** Everything the Utam tab needs; null before the Gate. */
export async function loadPathData(supabase: SupabaseClient, userId: string): Promise<PathData | null> {
  const streakStart = new Date(Date.now() - 366 * 86_400_000).toISOString();
  const [day, streakRes, journalRes, mirrorRes] = await Promise.all([
    loadDaySummary(supabase, userId),
    supabase.from('magia_sessions').select('started_at, completed').eq('user_id', userId).eq('completed', true).gte('started_at', streakStart),
    supabase.from('magia_journal').select('*').eq('user_id', userId).order('entry_date', { ascending: false }),
    supabase
      .from('magia_soul_mirror')
      .select('id, mirror, trait, element, intensity, resolved')
      .eq('user_id', userId)
      .order('intensity', { ascending: false }),
  ]);
  if (!day) return null;

  return {
    day,
    streak: computeStreak((streakRes.data ?? []) as { started_at: string; completed: boolean }[], toBudapestDate(new Date())),
    journal: (journalRes.data ?? []) as OldJournalEntry[],
    oldMirror: (mirrorRes.data ?? []) as OldMirrorItem[],
  };
}
