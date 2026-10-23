import { toBudapestDate } from './push-reminders';

/** The fokozatok I–III (index = fokozat) */
export const ROMAN_NUMERALS = ['', 'I', 'II', 'III'] as const;

/** Days in a row with a completed practice session, counting back from today (Budapest days). */
export function computeStreak(sessions: { started_at: string; completed: boolean }[], todayDate: string): number {
  if (!sessions.length) return 0;

  const activeDates = new Set(sessions.filter((s) => s.completed).map((s) => toBudapestDate(s.started_at)));

  let streak = 0;
  const today = new Date(todayDate + 'T00:00:00Z');

  for (let i = 0; i <= 365; i++) {
    const d = new Date(today.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    if (activeDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}
