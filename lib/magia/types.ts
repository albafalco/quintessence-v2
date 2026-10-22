import type { ElementType, SoulMirrorType } from '../magia-types';

/** Thought practice: 0 = observation, 1 = discipline, 2 = emptiness, 3 = all three mastered. */
export type ThoughtStage = 0 | 1 | 2 | 3;

/** The answer to "Sikerült?" after a practice. */
export type Outcome = 'igen' | 'reszben' | 'nem';

export type DayPart = 'reggel' | 'napkozben' | 'este';

/** One item of "A test iskolázása" (body training), chosen by the user. */
export interface BodyItem {
  /** Built-in item key, or `own_<n>` for the user's own item */
  key: string;
  /** Only for own items; built-in items take their label from the content file */
  label?: string;
  when: DayPart;
  /** Weekdays, 0 = Monday … 6 = Sunday; null = every day */
  days: number[] | null;
}

/** The thought-practice part of the path state (columns of `magia_path`). */
export interface ThoughtState {
  thought_stage: ThoughtStage;
  thought_minutes: number;
  thought_wins: number;
  thought_fails: number;
  thought_raised_on: string | null;
}

export interface BreathState {
  breath_target: number;
  breath_raised_on: string | null;
}

/** A row of `magia_path` (migration 020). */
export interface PathState extends ThoughtState, BreathState {
  user_id: string;
  gate_read_at: string | null;
  fokozat: 1 | 2 | 3;
  fokozat_started_at: string;
  wish: string | null;
  wish_set_at: string | null;
  thought_focus: string | null;
  body_plan: BodyItem[];
}

/** One evening rating: 1 = a little, 2 = moderately, 3 = very; '?' = not sure. Absent = not characteristic. */
export type Rating = 1 | 2 | 3 | '?';
export type Ratings = Record<string, Rating>;

/** 0 = not characteristic, 1 = mild, 2 = medium, 3 = strong */
export type Level = 0 | 1 | 2 | 3;

/** A trait as the evening cards and the mirror see it: core, dictionary or the user's own. */
export interface MirrorTrait {
  /** Core or dictionary key, or `own:<uuid>` */
  key: string;
  mirror: SoulMirrorType;
  /** null = unclassified (own word without element) */
  element: ElementType | null;
}
