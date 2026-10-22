/**
 * The evening self-examination: which traits are on the cards, and how a
 * trait is shown and searched. Pure; the caller passes the data.
 */
import type { ElementType, SoulMirrorType } from '../magia-types';
import type { SearchEntry } from './search';
import type { MirrorTrait, Ratings } from './types';

/** Structure of a dictionary trait (see traits.ts) */
export interface TraitInfo {
  key: string;
  mirror: SoulMirrorType;
  element: ElementType;
  core: boolean;
}

/** A trait added by the user (row of magia_user_traits) */
export interface AddedTrait {
  id: string;
  mirror: SoulMirrorType;
  trait_key: string | null;
  name: string | null;
  element: ElementType | null;
}

/** Text of a dictionary trait (tulajdonsagok.<locale>.json) */
export interface TraitWords {
  name: string;
  forms: string[];
  q?: string;
}

export const ownKey = (id: string) => `own:${id}`;

/** The key an added trait is rated under: its dictionary key, or `own:<id>`. */
export function addedKey(t: AddedTrait): string {
  return t.trait_key ?? ownKey(t.id);
}

/** The evening's traits: the core list in its order, then the added ones. */
export function mirrorTraits(dictionary: readonly TraitInfo[], added: AddedTrait[]): MirrorTrait[] {
  const byKey = new Map(dictionary.map((t) => [t.key, t]));
  const core = dictionary.filter((t) => t.core).map((t) => ({ key: t.key, mirror: t.mirror, element: t.element }));
  const coreKeys = new Set(core.map((t) => t.key));
  const extra: MirrorTrait[] = [];
  for (const a of added) {
    const key = addedKey(a);
    if (coreKeys.has(key) || extra.some((e) => e.key === key)) continue;
    const info = a.trait_key ? byKey.get(a.trait_key) : undefined;
    extra.push({ key, mirror: a.mirror, element: a.element ?? info?.element ?? null });
  }
  return [...core, ...extra];
}

/** Display name of a trait key; the first letter capitalised. */
export function traitName(key: string, words: Record<string, TraitWords>, added: AddedTrait[]): string {
  const raw = key.startsWith('own:') ? added.find((a) => ownKey(a.id) === key)?.name ?? '' : words[key]?.name ?? key;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Search entries: what is in the user's mirror is "mine", the rest of the dictionary "dict". */
export function searchEntries(
  dictionary: readonly TraitInfo[],
  words: Record<string, TraitWords>,
  added: AddedTrait[]
): SearchEntry[] {
  const addedKeys = new Set(added.map(addedKey));
  const entries: SearchEntry[] = dictionary.map((t) => ({
    key: t.key,
    mirror: t.mirror,
    name: words[t.key]?.name ?? t.key,
    forms: words[t.key]?.forms ?? [],
    source: t.core || addedKeys.has(t.key) ? 'mine' : 'dict',
  }));
  for (const a of added) {
    if (a.name) entries.push({ key: ownKey(a.id), mirror: a.mirror, name: a.name, forms: [], source: 'mine' });
  }
  return entries;
}

/** Counts of tonight's marks (1–3) by mirror. */
export function markedCounts(ratings: Ratings, traits: MirrorTrait[]): { fekete: number; feher: number } {
  const out = { fekete: 0, feher: 0 };
  for (const t of traits) {
    const r = ratings[t.key];
    if (r && r !== '?') out[t.mirror]++;
  }
  return out;
}
