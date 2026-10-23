import type { SupabaseClient } from '@supabase/supabase-js';
import type { AddedTrait } from './evening';
import type { TraitSummary } from './mirror';
import type { Level, Ratings } from './types';

export interface CycleFull {
  id: string;
  number: number;
  fokozat: number;
  length_days: number;
  started_on: string;
  closed_at: string | null;
  summary: Record<string, TraitSummary> | null;
  overrides: Record<string, Level>;
}

export interface MirrorEvening {
  obs_date: string;
  ratings: Ratings;
}

export interface DayNote {
  obs_date: string;
  trait_key: string;
  note: string | null;
}

export interface MirrorData {
  cycles: CycleFull[];
  /** The cycle shown: the requested one, else the open one, else the last closed */
  cycle: CycleFull | null;
  /** Its completed evenings, oldest first */
  evenings: MirrorEvening[];
  notes: DayNote[];
  userTraits: AddedTrait[];
  /** The closed cycle before the shown one (for the arrows) */
  previous: CycleFull | null;
}

/** Everything the "Tükör" tab needs. */
export async function loadMirrorData(supabase: SupabaseClient, userId: string, cycleNumber?: number): Promise<MirrorData> {
  const [cyclesRes, traitsRes] = await Promise.all([
    supabase
      .from('magia_cycles')
      .select('id, number, fokozat, length_days, started_on, closed_at, summary, overrides')
      .eq('user_id', userId)
      .order('number'),
    supabase.from('magia_user_traits').select('id, mirror, trait_key, name, element').eq('user_id', userId).order('created_at'),
  ]);
  const cycles = ((cyclesRes.data ?? []) as CycleFull[]).map((c) => ({ ...c, overrides: c.overrides ?? {} }));
  const cycle =
    cycles.find((c) => c.number === cycleNumber) ?? cycles.find((c) => !c.closed_at) ?? cycles[cycles.length - 1] ?? null;
  const previous = cycle ? ([...cycles].reverse().find((c) => c.number < cycle.number && c.closed_at) ?? null) : null;

  let evenings: MirrorEvening[] = [];
  let notes: DayNote[] = [];
  if (cycle) {
    const { data } = await supabase
      .from('magia_evenings')
      .select('obs_date, ratings')
      .eq('user_id', userId)
      .eq('cycle_id', cycle.id)
      .not('completed_at', 'is', null)
      .order('obs_date');
    evenings = ((data ?? []) as MirrorEvening[]).map((e) => ({ ...e, ratings: e.ratings ?? {} }));
    if (evenings.length) {
      const { data: noteRows } = await supabase
        .from('magia_day_notes')
        .select('obs_date, trait_key, note')
        .eq('user_id', userId)
        .gte('obs_date', evenings[0].obs_date)
        .lte('obs_date', evenings[evenings.length - 1].obs_date)
        .order('noted_at');
      notes = (noteRows ?? []) as DayNote[];
    }
  }

  return { cycles, cycle, evenings, notes, userTraits: (traitsRes.data ?? []) as AddedTrait[], previous };
}
