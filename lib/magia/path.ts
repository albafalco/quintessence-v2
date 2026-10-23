/**
 * Rules of the Fehér Mágia path (I. fokozat), as pure functions.
 * Dates are Budapest calendar days as 'YYYY-MM-DD' strings.
 *
 * Sources: Kovács-Magyar András, pp. 189–193 (thought practice, self-knowledge,
 * body training, breathing, eating, water) and the approved plan.
 */
import type { BodyItem, BreathState, DayPart, Outcome, ThoughtState } from './types';

export const THOUGHT_MAX_MINUTES = 10;
/** Successful 10-minute sessions in a row before the next stage is offered */
export const THOUGHT_WINS_TO_ADVANCE = 3;
/** Unsuccessful sessions in a row before stepping back a minute is offered */
export const THOUGHT_FAILS_TO_OFFER_BACK = 3;

export const BREATH_START = 7;
/** "tíz percnél tovább nem érdemes felmenni" */
export const BREATH_MAX_SEC = 600;

/** Practice days (completed evenings) before an exercise opens: one new step a week */
export const UNLOCK_BREATH_AFTER = 7;
export const UNLOCK_MEAL_WATER_AFTER = 14;

/** Closed self-knowledge cycles needed for the II. fokozat */
export const CYCLES_FOR_NEXT_FOKOZAT = 2;

// ── Practice days and session keys ─────────────────────────────────────────

/** A practice day starts at 4:00 Budapest time: a late evening still belongs to the day before. */
export const DAY_STARTS_AT_HOUR = 4;
/** Thought practice and breathing done from this hour on count as the evening session */
export const EVENING_FROM_HOUR = 15;

const budapestDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit' });
const budapestHour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Budapest', hour: '2-digit', hourCycle: 'h23' });

/** The practice day ('YYYY-MM-DD') a moment belongs to. */
export function practiceDate(at: Date | string): string {
  const ms = (typeof at === 'string' ? new Date(at) : at).getTime();
  return budapestDate.format(new Date(ms - DAY_STARTS_AT_HOUR * 3_600_000));
}

/** 'YYYY-MM-DD' plus `days` calendar days. */
export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Morning or evening session of the twice-daily practices. */
export function slotOf(at: Date | string): 'reggel' | 'este' {
  const hour = parseInt(budapestHour.format(typeof at === 'string' ? new Date(at) : at), 10);
  return hour >= DAY_STARTS_AT_HOUR && hour < EVENING_FROM_HOUR ? 'reggel' : 'este';
}

/** `magia_sessions.exercise_key` of the new path's practices */
export const SESSION_KEYS = {
  thought: (stage: number) => `szellem_1_gondolat_${stage}`,
  breath: 'test_1_legzes',
  body: (itemKey: string) => `test_1_test_${itemKey}`,
  meal: 'test_1_etkezes',
  water: 'test_1_viz',
  selfExam: 'lelek_1_onvizsgalat',
} as const;

/** A thought-practice session of any stage */
export const isThoughtKey = (key: string) => key.startsWith('szellem_1_gondolat_');

// ── Thought practice ────────────────────────────────────────────────────────

/** What the app offers after a session. */
export type ThoughtOffer =
  | 'up' // "Tovább N+1 percre, vagy maradsz?"
  | 'back' // "Háromszor nem sikerült: vissza egy percet?"
  | 'nextStage' // three successful 10-minute sessions: the next stage
  | 'allDone' // the third stage is mastered too
  | null;

export interface ThoughtResult {
  state: ThoughtState;
  offer: ThoughtOffer;
}

/**
 * Records the answer to "Sikerült?". The minutes never change here; the user
 * decides on the offer (acceptUp / acceptBack / advanceStage).
 * "Fáradt vagyok, befejezem" counts as 'reszben'.
 */
export function applyThoughtOutcome(s: ThoughtState, outcome: Outcome, today: string): ThoughtResult {
  if (outcome === 'reszben') {
    return { state: { ...s, thought_wins: 0, thought_fails: 0 }, offer: null };
  }
  if (outcome === 'nem') {
    const fails = s.thought_fails + 1;
    const offer = fails >= THOUGHT_FAILS_TO_OFFER_BACK && s.thought_minutes > 1 ? 'back' : null;
    return { state: { ...s, thought_wins: 0, thought_fails: fails }, offer };
  }
  // igen
  if (s.thought_minutes < THOUGHT_MAX_MINUTES) {
    // "Minden nap növeljük meg a gyakorlatra szánt időt egy perccel" — at most once a day
    const offer = s.thought_raised_on === today ? null : 'up';
    return { state: { ...s, thought_wins: 0, thought_fails: 0 }, offer };
  }
  const wins = s.thought_wins + 1;
  const done = wins >= THOUGHT_WINS_TO_ADVANCE;
  return {
    state: { ...s, thought_wins: wins, thought_fails: 0 },
    offer: done ? (s.thought_stage >= 2 ? 'allDone' : 'nextStage') : null,
  };
}

export function acceptUp(s: ThoughtState, today: string): ThoughtState {
  return {
    ...s,
    thought_minutes: Math.min(THOUGHT_MAX_MINUTES, s.thought_minutes + 1),
    thought_raised_on: today,
    thought_wins: 0,
  };
}

export function acceptBack(s: ThoughtState): ThoughtState {
  return { ...s, thought_minutes: Math.max(1, s.thought_minutes - 1), thought_fails: 0 };
}

/** "Még gyakorlom" / "Maradok" after a 'back' offer: start counting failures again. */
export function declineBack(s: ThoughtState): ThoughtState {
  return { ...s, thought_fails: 0 };
}

/** The next stage starts again at 1 minute; after the third, stage 3 = all mastered. */
export function advanceStage(s: ThoughtState): ThoughtState {
  const stage = Math.min(3, s.thought_stage + 1) as ThoughtState['thought_stage'];
  return {
    ...s,
    thought_stage: stage,
    thought_minutes: stage === 3 ? THOUGHT_MAX_MINUTES : 1,
    thought_wins: 0,
    thought_fails: 0,
    thought_raised_on: null,
  };
}

// ── Conscious breathing ─────────────────────────────────────────────────────

/**
 * Today's target: one more than the last reached target, once per practiced day.
 * `breath_raised_on` is the day the current target was last reached in under 10 minutes.
 */
export function breathTargetFor(s: BreathState, today: string): number {
  return s.breath_raised_on && s.breath_raised_on < today ? s.breath_target + 1 : s.breath_target;
}

/** State after a breathing session of `reps` breaths taking `durationSec`. */
export function afterBreath(s: BreathState, reps: number, durationSec: number, today: string): BreathState {
  const target = breathTargetFor(s, today);
  if (reps < target) {
    return { breath_target: target, breath_raised_on: s.breath_raised_on === today ? today : null };
  }
  // A session of 10 minutes or more stops the growth
  return { breath_target: target, breath_raised_on: durationSec < BREATH_MAX_SEC ? today : null };
}

// ── Weekly unlocks ──────────────────────────────────────────────────────────

/** Which exercises are open, by the number of completed evenings (practice days). */
export function unlockedExercises(completedEvenings: number): { breath: boolean; mealWater: boolean } {
  return {
    breath: completedEvenings >= UNLOCK_BREATH_AFTER,
    mealWater: completedEvenings >= UNLOCK_MEAL_WATER_AFTER,
  };
}

// ── Body training ───────────────────────────────────────────────────────────

/** The book's three morning items (p. 192), checked by default */
export const BOOK_BODY_ITEMS = ['kefeles', 'hideg_viz', 'torna'] as const;
/** Movement and sport offered next to them */
export const MORE_BODY_ITEMS = ['nyujtas', 'joga', 'seta', 'futas', 'kerekpar', 'uszas'] as const;

export function defaultBodyItem(key: string, label?: string): BodyItem {
  const book = (BOOK_BODY_ITEMS as readonly string[]).includes(key);
  return { key, ...(label ? { label } : {}), when: book ? 'reggel' : 'napkozben', days: null };
}

export function defaultBodyPlan(): BodyItem[] {
  return BOOK_BODY_ITEMS.map((key) => defaultBodyItem(key));
}

/** Weekday of a 'YYYY-MM-DD' date, 0 = Monday … 6 = Sunday. */
export function weekdayOf(date: string): number {
  return (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7;
}

export function isBodyItemDue(item: BodyItem, date: string): boolean {
  return item.days === null || item.days.includes(weekdayOf(date));
}

/** The items due on `date`, optionally only those of one part of the day. */
export function bodyItemsFor(plan: BodyItem[], date: string, when?: DayPart): BodyItem[] {
  return plan.filter((item) => isBodyItemDue(item, date) && (!when || item.when === when));
}

// ── Today's tasks ───────────────────────────────────────────────────────────

export type DayTaskKey = 'body' | 'thought' | 'breath' | 'meal' | 'water' | 'selfExam';

export interface DayTask {
  key: DayTaskKey;
  part: DayPart;
  done: boolean;
}

export interface DayTasksInput {
  bodyPlan: BodyItem[];
  thoughtStage: number;
  today: string;
  /** Sessions of the practice day */
  sessions: { exercise_key: string; started_at: string }[];
  unlocked: { breath: boolean; mealWater: boolean };
  eveningDone: boolean;
}

/**
 * Today's tasks in the order the "Ma" tab goes through them. The thought
 * practice and breathing come morning and evening; the body-training items
 * due in a part of the day make one task.
 */
export function dayTasks(input: DayTasksInput): DayTask[] {
  const { sessions, unlocked } = input;
  const keys = new Set(sessions.map((s) => s.exercise_key));
  const doneIn = (part: DayPart, match: (key: string) => boolean) =>
    sessions.some((s) => match(s.exercise_key) && slotOf(s.started_at) === part);
  const tasks: DayTask[] = [];
  for (const part of ['reggel', 'napkozben', 'este'] as const) {
    const body = bodyItemsFor(input.bodyPlan, input.today, part);
    if (body.length > 0) tasks.push({ key: 'body', part, done: body.every((i) => keys.has(SESSION_KEYS.body(i.key))) });
    if (part === 'napkozben') {
      if (unlocked.mealWater) {
        tasks.push({ key: 'meal', part, done: keys.has(SESSION_KEYS.meal) });
        tasks.push({ key: 'water', part, done: keys.has(SESSION_KEYS.water) });
      }
      continue;
    }
    if (input.thoughtStage < 3) tasks.push({ key: 'thought', part, done: doneIn(part, isThoughtKey) });
    if (unlocked.breath) tasks.push({ key: 'breath', part, done: doneIn(part, (k) => k === SESSION_KEYS.breath) });
    if (part === 'este') tasks.push({ key: 'selfExam', part, done: input.eveningDone });
  }
  return tasks;
}

// ── The I. fokozat ──────────────────────────────────────────────────────────
// Body training, breathing, eating and water are daily habits for life: the
// book lists them as the practice of the I. fokozat and the II. adds to them
// (p. 198). They have no goal and do not gate the next fokozat. Only the
// thought practice has to be mastered ("amíg az elsőt nem uraljuk
// maradéktalanul") and the two soul mirrors have to be made.

export interface FokozatIInput {
  gateRead: boolean;
  thoughtStage: number;
  closedCycles: number;
  /** Where the current thought stage stands (for the percent) */
  thoughtMinutes?: number;
  thoughtWins?: number;
  /** Completed evenings of the open cycle and its length (for the percent) */
  openCycleDays?: number;
  openCycleLength?: number;
}

export interface Condition {
  key: 'gate' | 'thought' | 'cycles';
  value: number;
  target: number;
  done: boolean;
}

/**
 * The conditions of the II. fokozat and how far along they are. The percent
 * counts six equal steps (the Gate, three thought stages, two cycles) and the
 * way into the current stage and cycle, so it moves day by day.
 */
export function fokozatIConditions(input: FokozatIInput): { conditions: Condition[]; allDone: boolean; percent: number } {
  const cond = (key: Condition['key'], value: number, target: number): Condition => ({
    key,
    value: Math.min(value, target),
    target,
    done: value >= target,
  });
  const conditions = [
    cond('gate', input.gateRead ? 1 : 0, 1),
    cond('thought', input.thoughtStage, 3),
    cond('cycles', input.closedCycles, CYCLES_FOR_NEXT_FOKOZAT),
  ];
  const allDone = conditions.every((c) => c.done);

  // Into the current stage: 1 → 10 minutes, then the successful 10-minute sessions
  const stageSteps = THOUGHT_MAX_MINUTES - 1 + THOUGHT_WINS_TO_ADVANCE;
  const intoStage =
    input.thoughtStage < 3 ? Math.min(1, ((input.thoughtMinutes ?? 1) - 1 + (input.thoughtWins ?? 0)) / stageSteps) : 0;
  const intoCycle = input.openCycleLength ? Math.min(1, (input.openCycleDays ?? 0) / input.openCycleLength) : 0;
  const steps =
    conditions[0].value +
    Math.min(3, conditions[1].value + intoStage) +
    Math.min(CYCLES_FOR_NEXT_FOKOZAT, conditions[2].value + intoCycle);
  const percent = allDone ? 100 : Math.min(99, Math.round((steps / (4 + CYCLES_FOR_NEXT_FOKOZAT)) * 100));
  return { conditions, allDone, percent };
}
