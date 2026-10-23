import type { SupabaseClient } from '@supabase/supabase-js';
import vocabulary from '@/messages/content/angol-vocabulary.json';
import { BADGES, isEarned, longestDayStreak, type BadgeStats } from '@/lib/badges';
import { toBudapestDate } from '@/lib/push-reminders';
import { mergeUnlockedSections } from '@/lib/angol-unlocks';

const PRACTICE_SECTIONS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export interface BadgeState {
  stats: BadgeStats;
  /** badge id → earned_at (null when earned but the badge table is not available yet) */
  earned: Record<string, string | null>;
  /** Badges stored for the first time during this sync (for the toast) */
  newlyEarned: string[];
}

export async function loadBadgeStats(supabase: SupabaseClient, userId: string): Promise<BadgeStats> {
  const [sessions, cards, exams, unlocks, path, cycles] = await Promise.all([
    supabase.from('magia_sessions').select('started_at, duration_sec, completed').eq('user_id', userId),
    supabase.from('angol_card_progress').select('correct_count').eq('user_id', userId),
    supabase.from('angol_exam_results').select('passed').eq('user_id', userId).eq('passed', true),
    supabase.from('angol_section_unlocks').select('section_id').eq('user_id', userId).eq('lesson_id', 1),
    supabase.from('magia_path').select('fokozat, thought_stage').eq('user_id', userId).maybeSingle(),
    supabase.from('magia_cycles').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('closed_at', 'is', null),
  ]);

  const sessionRows = (sessions.data ?? []) as { started_at: string; duration_sec: number | null; completed: boolean }[];
  const unlocked = new Set(mergeUnlockedSections(((unlocks.data ?? []) as { section_id: number }[]).map((u) => u.section_id)));
  // The path row exists once the Gate is read
  const pathRow = path.data as { fokozat: number; thought_stage: number } | null;

  return {
    sessionCount: sessionRows.length,
    longestStreak: longestDayStreak(sessionRows.filter((s) => s.completed).map((s) => toBudapestDate(s.started_at))),
    totalPracticeSec: sessionRows.reduce((sum, s) => sum + (s.duration_sec ?? 0), 0),
    masteredExercises: pathRow?.thought_stage ?? 0,
    masteredFokozatok: pathRow ? pathRow.fokozat - 1 : 0,
    closedCycles: cycles.count ?? 0,
    learnedWords: ((cards.data ?? []) as { correct_count: number }[]).filter((c) => c.correct_count >= 3).length,
    vocabularySize: (vocabulary as unknown[]).length,
    passedExams: (exams.data ?? []).length,
    unlockedPracticeSections: PRACTICE_SECTIONS.filter((id) => unlocked.has(id)).length,
    practiceSectionCount: PRACTICE_SECTIONS.length,
  };
}

/**
 * Computes the badges and stores newly earned ones (keeping the first
 * earned date). Works read-only before migration 010 (no dates, no toasts).
 */
/** `angol: false` — Kreatív Angol is locked for this user: its badges are not awarded. */
export async function syncBadges(supabase: SupabaseClient, userId: string, { angol }: { angol: boolean }): Promise<BadgeState> {
  const stats = await loadBadgeStats(supabase, userId);
  const earnedIds = BADGES.filter((b) => (angol || b.category !== 'angol') && isEarned(b, stats)).map((b) => b.id);

  const { data: stored, error } = await supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', userId);
  if (error) {
    return { stats, earned: Object.fromEntries(earnedIds.map((id) => [id, null])), newlyEarned: [] };
  }

  const earned: Record<string, string | null> = Object.fromEntries(
    ((stored ?? []) as { badge_id: string; earned_at: string }[]).map((r) => [r.badge_id, r.earned_at])
  );
  const missing = earnedIds.filter((id) => !(id in earned));
  let newlyEarned: string[] = [];
  if (missing.length > 0) {
    const now = new Date().toISOString();
    const { error: insertError } = await supabase
      .from('user_badges')
      .insert(missing.map((badge_id) => ({ user_id: userId, badge_id, earned_at: now })));
    if (!insertError) {
      newlyEarned = missing;
      for (const id of missing) earned[id] = now;
    } else if (insertError.code !== '23505') {
      // 23505: already stored by a parallel sync (e.g. another tab)
      console.error('[badges] storing badges failed', insertError);
    }
  }
  return { stats, earned, newlyEarned };
}
