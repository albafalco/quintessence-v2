import { MAGIA_FOKOZATOK } from './magia-data';
import type { MagiaSection, MagiaProgressRecord, ExerciseStatus } from './magia-types';

// Re-export for backward compatibility
export type { MagiaProgressRecord } from './magia-types';

export const ROMAN_NUMERALS = [
  '',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
] as const;

export function buildExerciseKey(
  section: MagiaSection,
  fokozat: number,
  key: string
): string {
  return `${section}_${fokozat}_${key}`;
}

export function getExerciseCount(fokozatId: number, section: MagiaSection): number {
  const fokozat = MAGIA_FOKOZATOK.find((f) => f.id === fokozatId);
  if (!fokozat) return 0;
  return fokozat[section].gyakorlatok.length;
}

export function getSectionProgress(
  fokozatId: number,
  section: MagiaSection,
  progress: MagiaProgressRecord[]
): { completed: number; mastered: number; total: number; percent: number } {
  const total = getExerciseCount(fokozatId, section);
  const sectionRecords = progress.filter(
    (p) => p.fokozat === fokozatId && p.section === section
  );
  const completed = sectionRecords.filter((p) => p.completed).length;
  const mastered = sectionRecords.filter((p) => p.status === 'mastered').length;
  return {
    completed,
    mastered,
    total,
    percent: total > 0 ? Math.round((mastered / total) * 100) : 0,
  };
}

export function getFokozatProgress(
  fokozatId: number,
  progress: MagiaProgressRecord[]
): { completed: number; mastered: number; total: number; percent: number } {
  const sections: MagiaSection[] = ['szellem', 'lelek', 'test'];
  let completed = 0;
  let mastered = 0;
  let total = 0;

  for (const section of sections) {
    const sp = getSectionProgress(fokozatId, section, progress);
    completed += sp.completed;
    mastered += sp.mastered;
    total += sp.total;
  }

  return {
    completed,
    mastered,
    total,
    percent: total > 0 ? Math.round((mastered / total) * 100) : 0,
  };
}

export function getExerciseProgress(
  fokozatId: number,
  section: MagiaSection,
  exerciseKey: string,
  progress: MagiaProgressRecord[]
): { completed: boolean; notes: string; status: ExerciseStatus; sessionCount: number } {
  const fullKey = buildExerciseKey(section, fokozatId, exerciseKey);
  const record = progress.find(
    (p) =>
      p.fokozat === fokozatId &&
      p.section === section &&
      p.exercise_key === fullKey
  );
  return {
    completed: record?.completed ?? false,
    notes: record?.notes ?? '',
    status: record?.status ?? 'not_started',
    sessionCount: record?.session_count ?? 0,
  };
}

export function isFokozatMastered(
  fokozatId: number,
  progress: MagiaProgressRecord[]
): boolean {
  const sections: MagiaSection[] = ['szellem', 'lelek', 'test'];
  return sections.every((section) => {
    const fokozat = MAGIA_FOKOZATOK.find((f) => f.id === fokozatId);
    if (!fokozat) return false;
    return fokozat[section].gyakorlatok.every((exercise) => {
      const fullKey = buildExerciseKey(section, fokozatId, exercise.key);
      const record = progress.find(
        (p) => p.fokozat === fokozatId && p.section === section && p.exercise_key === fullKey
      );
      return record?.status === 'mastered';
    });
  });
}

export function isFokozatUnlocked(
  fokozatId: number,
  progress: MagiaProgressRecord[]
): boolean {
  if (fokozatId === 1) return true;
  return isFokozatMastered(fokozatId - 1, progress);
}

export function getNextDailyTargetSec(
  startSec: number,
  stepSec: number,
  maxSec: number,
  sessionCount: number
): number {
  return Math.min(startSec + stepSec * sessionCount, maxSec);
}

export interface DailyHeatmapEntry {
  date: string;
  totalSec: number;
  sessionCount: number;
}

export interface PillarBalance {
  szellem: number;
  lelek: number;
  test: number;
  totalSec: number;
}

export interface SessionRecord {
  id: string;
  fokozat: number;
  section: MagiaSection;
  exercise_key: string;
  started_at: string;
  duration_sec: number | null;
  completed: boolean;
}

export function getCurrentFokozatId(progress: MagiaProgressRecord[]): number {
  for (let id = 1; id <= 10; id++) {
    if (!isFokozatMastered(id, progress)) return id;
  }
  return 10;
}

export function computeStreak(
  sessions: Pick<SessionRecord, 'started_at' | 'completed'>[],
  todayDate: string
): number {
  if (!sessions.length) return 0;

  const activeDates = new Set(
    sessions.filter((s) => s.completed).map((s) => s.started_at.split('T')[0])
  );

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

export function computeHeatmap(
  sessions: Pick<SessionRecord, 'started_at' | 'duration_sec'>[],
  days = 35
): DailyHeatmapEntry[] {
  const map = new Map<string, DailyHeatmapEntry>();

  for (const s of sessions) {
    const date = s.started_at.split('T')[0];
    const existing = map.get(date) ?? { date, totalSec: 0, sessionCount: 0 };
    map.set(date, {
      date,
      totalSec: existing.totalSec + (s.duration_sec ?? 0),
      sessionCount: existing.sessionCount + 1,
    });
  }

  const result: DailyHeatmapEntry[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    result.push(map.get(dateStr) ?? { date: dateStr, totalSec: 0, sessionCount: 0 });
  }
  return result;
}

export function computePillarBalance(
  sessions: Pick<SessionRecord, 'section' | 'duration_sec'>[]
): PillarBalance {
  let szellem = 0;
  let lelek = 0;
  let test = 0;

  for (const s of sessions) {
    const sec = s.duration_sec ?? 0;
    if (s.section === 'szellem') szellem += sec;
    else if (s.section === 'lelek') lelek += sec;
    else if (s.section === 'test') test += sec;
  }

  return { szellem, lelek, test, totalSec: szellem + lelek + test };
}
