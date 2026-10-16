import { createClient } from '@/lib/supabase/client';
import { toBudapestDate } from '@/lib/push-reminders';

/**
 * Marks today as an English practice day, so the evening reminder is not sent.
 * Best-effort: failures are ignored (the practice itself must not be blocked).
 */
export async function recordAngolActivity(): Promise<void> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await supabase
      .from('profiles')
      .update({ last_angol_activity_date: toBudapestDate(new Date()) })
      .eq('id', data.session.user.id);
  } catch {
    // ignore
  }
}
