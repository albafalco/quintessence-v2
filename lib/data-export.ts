import type { SupabaseClient } from '@supabase/supabase-js';

/** Tables exported for the signed-in user (RLS limits every query to own rows). */
const USER_TABLES = [
  'magia_progress',
  'magia_sessions',
  'magia_journal',
  'magia_soul_mirror',
  // The new Fehér Mágia path (migration 020)
  'magia_path',
  'magia_cycles',
  'magia_evenings',
  'magia_user_traits',
  'magia_day_notes',
  'angol_card_progress',
  'angol_section_unlocks',
  'angol_exam_results',
  'angol_hard_items',
  'user_badges',
  'user_notifications',
  'announcement_reads',
  'name_change_requests',
] as const;

/** Collects all of the user's data into one JSON-serialisable object. */
export async function collectUserData(supabase: SupabaseClient, userId: string, email: string | undefined) {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

  const tables: Record<string, unknown[]> = {};
  for (const table of USER_TABLES) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
    // Tables of migrations not run yet are simply skipped
    if (!error) tables[table] = data ?? [];
  }

  // Push subscription keys are device secrets: export only how many there are
  const { count: pushDevices } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    exportedAt: new Date().toISOString(),
    app: 'Quintessence',
    account: { email, ...profile },
    pushDevices: pushDevices ?? 0,
    ...tables,
  };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Safari cancels the download if the URL is revoked immediately
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
