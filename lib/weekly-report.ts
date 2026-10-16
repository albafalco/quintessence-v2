import type { SupabaseClient } from '@supabase/supabase-js';
import type { ElementType, MagiaSection } from '@/lib/magia-types';
import { buildExerciseKey, computePillarBalance, computeStreak, type PillarBalance } from '@/lib/magia-utils';
import { getBudapestDayBounds, toBudapestDate } from '@/lib/push-reminders';
import { isMissingColumnError } from '@/lib/supabase/missing-column';
import type { FokozatData } from '@/lib/i18n-content';

// ── Calendar helpers (YYYY-MM-DD strings, Budapest calendar) ────────────────

export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `date`. */
export function weekStartOf(date: string): string {
  const dow = new Date(date + 'T00:00:00Z').getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}

export function isSunday(date: string): boolean {
  return new Date(date + 'T00:00:00Z').getUTCDay() === 0;
}

export function weekBounds(monday: string): { start: string; end: string } {
  return {
    start: getBudapestDayBounds(monday).start,
    end: getBudapestDayBounds(addDays(monday, 6)).end,
  };
}

// ── Report data ──────────────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  fokozat: number;
  section: MagiaSection;
  exercise_key: string;
  started_at: string;
  duration_sec: number | null;
  completed: boolean;
  rating: number | null;
  note: string | null;
}

export interface WeeklyReport {
  monday: string;
  sunday: string;
  totalMinutes: number;
  sessionCount: number;
  prevMinutes: number;
  /** Mon..Sun: practiced (completed session) on that day */
  activeDays: boolean[];
  streak: number;
  pillars: PillarBalance;
  best: { title: string; rating: number; durationSec: number; note: string | null } | null;
  progressed: { title: string; count: number }[];
  mastered: string[];
  journalCount: number;
  nextPlans: { date: string; text: string }[];
  /** null when the resolved_at column is not available yet (migration 008) */
  resolvedByElement: Record<ElementType, number> | null;
}

export function buildExerciseTitles(fokozatok: FokozatData[]): Map<string, string> {
  const titles = new Map<string, string>();
  for (const f of fokozatok) {
    for (const section of ['szellem', 'lelek', 'test'] as const) {
      for (const g of f[section].gyakorlatok) titles.set(buildExerciseKey(section, f.id, g.key), g.cim);
    }
  }
  return titles;
}

export async function loadWeeklyReport(
  supabase: SupabaseClient,
  userId: string,
  monday: string,
  todayDate: string,
  titles: Map<string, string>
): Promise<WeeklyReport> {
  const sunday = addDays(monday, 6);
  const { start, end } = weekBounds(monday);
  const prev = weekBounds(addDays(monday, -7));
  const streakDay = todayDate < sunday ? todayDate : sunday;
  const streakStart = new Date(new Date(end).getTime() - 400 * 86_400_000).toISOString();
  const titleOf = (key: string) => titles.get(key) ?? key;

  const [sessionsRes, prevRes, streakRes, masteredRes, journalRes] = await Promise.all([
    supabase
      .from('magia_sessions')
      .select('id, fokozat, section, exercise_key, started_at, duration_sec, completed, rating, note')
      .eq('user_id', userId)
      .gte('started_at', start)
      .lte('started_at', end),
    supabase
      .from('magia_sessions')
      .select('duration_sec')
      .eq('user_id', userId)
      .gte('started_at', prev.start)
      .lte('started_at', prev.end),
    supabase
      .from('magia_sessions')
      .select('started_at, completed')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('started_at', streakStart)
      .lte('started_at', end),
    supabase
      .from('magia_progress')
      .select('exercise_key, mastered_at')
      .eq('user_id', userId)
      .eq('status', 'mastered')
      .gte('mastered_at', start)
      .lte('mastered_at', end),
    supabase
      .from('magia_journal')
      .select('entry_date, next_plan')
      .eq('user_id', userId)
      .gte('entry_date', monday)
      .lte('entry_date', sunday)
      .order('entry_date', { ascending: true }),
  ]);

  const sessions = (sessionsRes.data ?? []) as SessionRow[];
  const totalSec = sessions.reduce((sum, s) => sum + (s.duration_sec ?? 0), 0);
  const prevSec = (prevRes.data ?? []).reduce((sum, s) => sum + ((s.duration_sec as number | null) ?? 0), 0);

  const activeDates = new Set(sessions.filter((s) => s.completed).map((s) => toBudapestDate(s.started_at)));
  const activeDays = Array.from({ length: 7 }, (_, i) => activeDates.has(addDays(monday, i)));

  const rated = sessions.filter((s) => s.rating != null);
  rated.sort((a, b) => (b.rating! - a.rating!) || ((b.duration_sec ?? 0) - (a.duration_sec ?? 0)));
  const bestRow = rated[0];

  const counts = new Map<string, number>();
  for (const s of sessions) counts.set(s.exercise_key, (counts.get(s.exercise_key) ?? 0) + 1);
  const progressed = Array.from(counts.entries())
    .map(([key, count]) => ({ title: titleOf(key), count }))
    .sort((a, b) => b.count - a.count);

  const journal = (journalRes.data ?? []) as { entry_date: string; next_plan: string | null }[];

  // Resolved soul mirror items need the resolved_at column (migration 008).
  let resolvedByElement: WeeklyReport['resolvedByElement'] = null;
  const resolvedRes = await supabase
    .from('magia_soul_mirror')
    .select('element, resolved_at')
    .eq('user_id', userId)
    .gte('resolved_at', start)
    .lte('resolved_at', end);
  if (!isMissingColumnError(resolvedRes.error)) {
    resolvedByElement = { tuz: 0, levego: 0, viz: 0, fold: 0 };
    for (const row of (resolvedRes.data ?? []) as { element: ElementType | null }[]) {
      if (row.element) resolvedByElement[row.element]++;
    }
  }

  return {
    monday,
    sunday,
    totalMinutes: Math.round(totalSec / 60),
    sessionCount: sessions.length,
    prevMinutes: Math.round(prevSec / 60),
    activeDays,
    streak: computeStreak((streakRes.data ?? []) as { started_at: string; completed: boolean }[], streakDay),
    pillars: computePillarBalance(sessions),
    best: bestRow
      ? { title: titleOf(bestRow.exercise_key), rating: bestRow.rating!, durationSec: bestRow.duration_sec ?? 0, note: bestRow.note }
      : null,
    progressed,
    mastered: ((masteredRes.data ?? []) as { exercise_key: string }[]).map((r) => titleOf(r.exercise_key)),
    journalCount: journal.length,
    nextPlans: journal
      .filter((j) => j.next_plan && j.next_plan.trim())
      .map((j) => ({ date: j.entry_date, text: j.next_plan!.trim() })),
    resolvedByElement,
  };
}
