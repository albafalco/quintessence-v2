/**
 * Trait search for the "+" note and the "add your own" step: accent-insensitive,
 * matching the name and every word form. Pure; the caller builds the entries.
 */
import type { SoulMirrorType } from '../magia-types';

export interface SearchEntry {
  key: string;
  mirror: SoulMirrorType;
  name: string;
  forms: string[];
  /** mine = already in the user's mirror (core list or added), core = the card list, dict = extended dictionary */
  source: 'mine' | 'core' | 'dict';
}

export interface SearchResult {
  mine: SearchEntry[];
  core: SearchEntry[];
  dict: SearchEntry[];
  /** Some entry matches the query exactly (then "add as your own word" is not offered) */
  exact: boolean;
}

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Results by source, each group capped; exact matches first. Needs at least 2 characters. */
export function searchTraits(query: string, entries: SearchEntry[], mirror: SoulMirrorType, perGroup = 3): SearchResult {
  const q = normalize(query);
  const empty: SearchResult = { mine: [], core: [], dict: [], exact: false };
  if (q.length < 2) return empty;

  const hits: { e: SearchEntry; exact: boolean }[] = [];
  for (const e of entries) {
    if (e.mirror !== mirror) continue;
    const words = [e.name, ...e.forms].map(normalize);
    // The start of a word: "ideg" finds "ideges", not "ridegség"
    const starts = words.some((w) => w.startsWith(q) || w.split(/[\s-]+/).some((part) => part.startsWith(q)));
    if (starts) hits.push({ e, exact: words.some((w) => w === q) });
  }
  hits.sort((a, b) => Number(b.exact) - Number(a.exact));

  const group = (source: SearchEntry['source']) => hits.filter((h) => h.e.source === source).slice(0, perGroup).map((h) => h.e);
  return { mine: group('mine'), core: group('core'), dict: group('dict'), exact: hits.some((h) => h.exact) };
}
