/**
 * The 14-day mirror: evening ratings → averages, levels, elements, the order of
 * the evening cards. Pure functions; the caller passes the traits and evenings.
 */
import type { ElementType, SoulMirrorType } from '../magia-types';
import type { Level, MirrorTrait, Ratings } from './types';

export const CYCLE_DAYS = 14;
/** Fewer black traits at least "kicsit" than this → the app offers one more week */
export const HONESTY_MIN_BLACK = 8;
export const HONESTY_EXTRA_DAYS = 7;
/** Rows of one evening card, so it fits a phone screen without scrolling */
export const CARD_MAX_ROWS = 12;

export const ELEMENTS: readonly ElementType[] = ['tuz', 'levego', 'viz', 'fold'];

export interface TraitSummary {
  /** Average of the evenings, 0..3; "not sure" evenings do not count */
  avg: number;
  level: Level;
  /** Evenings on which the trait was present (1–3) */
  days: number;
  /** Evenings marked "not sure" */
  unsure: number;
}

/** "átlag ≥ 2,5 erős, ≥ 1,5 közepes, ≥ 0,5 enyhe" */
export function levelOf(avg: number): Level {
  if (avg >= 2.5) return 3;
  if (avg >= 1.5) return 2;
  if (avg >= 0.5) return 1;
  return 0;
}

/** Summary of completed evenings; a missing rating means "not characteristic" (0). */
export function summarize(evenings: Ratings[], keys: string[]): Record<string, TraitSummary> {
  const out: Record<string, TraitSummary> = {};
  for (const key of keys) {
    let sum = 0;
    let counted = 0;
    let days = 0;
    let unsure = 0;
    for (const ratings of evenings) {
      const r = ratings[key];
      if (r === '?') {
        unsure++;
        continue;
      }
      const v = r ?? 0;
      sum += v;
      counted++;
      if (v > 0) days++;
    }
    const avg = counted ? sum / counted : 0;
    out[key] = { avg, level: levelOf(avg), days, unsure };
  }
  return out;
}

/** The level after the user's own sorting ("osszuk fel három csoportra"). */
export function effectiveLevel(summary: Record<string, TraitSummary>, overrides: Record<string, Level>, key: string): Level {
  return overrides[key] ?? summary[key]?.level ?? 0;
}

/** Sum of levels per element of one mirror, and the dominant element. */
export function elementBalance(
  traits: MirrorTrait[],
  mirror: SoulMirrorType,
  summary: Record<string, TraitSummary>,
  overrides: Record<string, Level> = {}
): { totals: Record<ElementType, number>; dominant: ElementType | null } {
  const totals: Record<ElementType, number> = { tuz: 0, levego: 0, viz: 0, fold: 0 };
  for (const t of traits) {
    if (t.mirror !== mirror || !t.element) continue;
    totals[t.element] += effectiveLevel(summary, overrides, t.key);
  }
  let dominant: ElementType | null = null;
  for (const el of ELEMENTS) {
    if (totals[el] > 0 && (dominant === null || totals[el] > totals[dominant])) dominant = el;
  }
  return { totals, dominant };
}

/** Honesty check at the end of a cycle: too few black traits → offer one more week. */
export function needsHonestyWeek(
  traits: MirrorTrait[],
  summary: Record<string, TraitSummary>,
  overrides: Record<string, Level> = {}
): boolean {
  const present = traits.filter((t) => t.mirror === 'fekete' && effectiveLevel(summary, overrides, t.key) >= 1).length;
  return present < HONESTY_MIN_BLACK;
}

/** Level change since the previous cycle (+ stronger, − weaker); only traits in both. */
export function levelChanges(
  previous: Record<string, TraitSummary>,
  current: Record<string, TraitSummary>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(current)) {
    if (previous[key]) out[key] = current[key].level - previous[key].level;
  }
  return out;
}

/** The cycle has as many completed evenings as its length: it can be closed. */
export function isCycleReady(completedEvenings: number, lengthDays: number): boolean {
  return completedEvenings >= lengthDays;
}

export interface GridGroup {
  /** null = unclassified own words */
  element: ElementType | null;
  keys: string[];
}

/**
 * Rows of the 14-day grid of one mirror: the present traits element by
 * element, strongest first; the not characteristic ones apart (collapsed).
 */
export function gridGroups(
  traits: MirrorTrait[],
  mirror: SoulMirrorType,
  summary: Record<string, TraitSummary>,
  overrides: Record<string, Level> = {}
): { groups: GridGroup[]; quiet: string[] } {
  const list = traits.filter((t) => t.mirror === mirror);
  const level = (key: string) => effectiveLevel(summary, overrides, key);
  const avg = (key: string) => summary[key]?.avg ?? 0;
  const groups: GridGroup[] = [];
  for (const element of [...ELEMENTS, null]) {
    const keys = list
      .filter((t) => t.element === element && level(t.key) > 0)
      .map((t) => t.key)
      .sort((a, b) => level(b) - level(a) || avg(b) - avg(a));
    if (keys.length) groups.push({ element, keys });
  }
  return { groups, quiet: list.filter((t) => level(t.key) === 0).map((t) => t.key) };
}

export interface EveningCard {
  mirror: SoulMirrorType;
  /** 'marked' = present so far in this cycle, strongest first; otherwise one element (null = unclassified) */
  kind: 'marked' | 'element';
  element: ElementType | null;
  keys: string[];
}

function chunk(keys: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < keys.length; i += size) out.push(keys.slice(i, i + size));
  return out;
}

/**
 * The cards of one evening: black mirror first, then white. From the 2nd day on
 * the first card(s) of each mirror hold the traits present so far in the cycle,
 * strongest first; the rest follow element by element, in list order.
 */
export function buildEveningCards(
  traits: MirrorTrait[],
  cycleSoFar: Record<string, TraitSummary>,
  maxRows = CARD_MAX_ROWS
): EveningCard[] {
  const cards: EveningCard[] = [];
  for (const mirror of ['fekete', 'feher'] as const) {
    const list = traits.filter((t) => t.mirror === mirror);
    const marked = list
      .filter((t) => (cycleSoFar[t.key]?.days ?? 0) > 0)
      .sort((a, b) => (cycleSoFar[b.key].avg - cycleSoFar[a.key].avg) || (cycleSoFar[b.key].days - cycleSoFar[a.key].days));
    const markedKeys = new Set(marked.map((t) => t.key));
    for (const keys of chunk(marked.map((t) => t.key), maxRows)) {
      cards.push({ mirror, kind: 'marked', element: null, keys });
    }
    for (const element of [...ELEMENTS, null]) {
      const rest = list.filter((t) => t.element === element && !markedKeys.has(t.key)).map((t) => t.key);
      for (const keys of chunk(rest, maxRows)) {
        cards.push({ mirror, kind: 'element', element, keys });
      }
    }
  }
  return cards;
}
