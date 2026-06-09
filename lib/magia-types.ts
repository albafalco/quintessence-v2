export type ExerciseType =
  | 'progressive_timed'
  | 'timed'
  | 'habit'
  | 'worksheet'
  | 'journal'
  | 'practice'
  | 'instructional';

export type ExerciseStatus = 'not_started' | 'in_progress' | 'mastered';
export type MagiaSection = 'szellem' | 'lelek' | 'test';
export type SoulMirrorType = 'fekete' | 'feher';
export type ElementType = 'tuz' | 'levego' | 'viz' | 'fold';
export type WorkMethod = 'uralas' | 'autoszuggeszcio' | 'transzmutacio';

export interface ExerciseParams {
  startSec?: number;
  stepSec?: number;
  maxSec?: number;
  targetSec?: number;
  frequency?: 'daily' | 'twice_daily' | 'per_meal';
}

export interface Exercise {
  key: string;
  cim: string;
  leiras: string;
  type: ExerciseType;
  params?: ExerciseParams;
  successCriteria: string;
  minSessions?: number;
}

export interface MagiaProgressRecord {
  fokozat: number;
  section: MagiaSection;
  exercise_key: string;
  completed: boolean;
  notes: string | null;
  status?: ExerciseStatus;
  mastered_at?: string | null;
  session_count?: number;
}

export interface MagiaSession {
  id: string;
  user_id: string;
  fokozat: number;
  section: MagiaSection;
  exercise_key: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  target_sec: number | null;
  completed: boolean;
  rating: number | null;
  disturbances: string | null;
  note: string | null;
  created_at: string;
}

export interface SoulMirrorItem {
  id: string;
  user_id: string;
  mirror: SoulMirrorType;
  trait: string;
  element: ElementType | null;
  intensity: 1 | 2 | 3;
  work_method: WorkMethod | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryData {
  id: string;
  fokozat: number | null;
  section?: MagiaSection | null;
  exercise_key?: string | null;
  session_id?: string | null;
  entry_date: string;
  content: string;
  successes?: string | null;
  failures?: string | null;
  duration_sec?: number | null;
  disturbances?: string | null;
  self_criticism?: string | null;
  next_plan?: string | null;
  created_at: string;
  updated_at: string;
}
