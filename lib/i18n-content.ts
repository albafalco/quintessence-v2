import { fallbackLocale, type Locale } from '@/i18n';

/** A reading page; `*text*` marks italics, `\n` a line break. */
export interface ReadingPage {
  title: string;
  /** Book page(s) the text is quoted from */
  page?: string;
  paragraphs: string[];
}

export interface ThoughtStageText {
  name: string;
  short: string;
  how: string;
  question: string;
  done: string;
}

/** Texts of the Fehér Mágia path (Kovács-Magyar András, quoted verbatim). */
export interface FeherMagiaContent {
  source: string;
  gate: { pages: ReadingPage[]; timeQuote: string };
  utravalo: Record<'gondolat' | 'fegyelmezes' | 'uresseg' | 'onvizsgalat' | 'test' | 'legzes' | 'etkezes' | 'viz', ReadingPage>;
  thought: { stages: [ThoughtStageText, ThoughtStageText, ThoughtStageText] };
  wishes: string[];
  body: Record<string, string>;
  elements: {
    names: Record<'tuz' | 'levego' | 'viz' | 'fold', string>;
    temperaments: Record<'tuz' | 'levego' | 'viz' | 'fold', string>;
    hints: Record<'fekete' | 'feher', Record<'tuz' | 'levego' | 'viz' | 'fold', string>>;
  };
  sleep: string;
  /** I.–III. fokozat on the Utam tab; the items are the preview of the locked ones */
  fokozatok: FokozatText[];
}

export interface FokozatText {
  theme: string;
  items?: { name: string; text: string }[];
}

/** Text of one trait of lib/magia/traits.ts; `q` (recognition question) only for core traits. */
export interface TraitText {
  name: string;
  forms: string[];
  q?: string;
}

type ContentKind = 'feher-magia' | 'tulajdonsagok';

const cache = new Map<string, unknown>();

async function importContent<T>(locale: Locale, kind: ContentKind): Promise<T> {
  const mod = await import(`@/messages/content/${kind}.${locale}.json`);
  return mod.default as T;
}

/**
 * Locale, then the fallback locale, then Hungarian (the source language):
 * the new Fehér Mágia texts exist in Hungarian first and are translated later.
 */
async function importWithFallback<T>(locale: Locale, kind: ContentKind): Promise<T> {
  const chain = Array.from(new Set<Locale>([locale, fallbackLocale, 'hu']));
  for (const candidate of chain) {
    try {
      return await importContent<T>(candidate, kind);
    } catch {
      // not translated yet: try the next one
    }
  }
  throw new Error(`[i18n-content] ${kind} is missing in every locale`);
}

async function loadCached<T>(locale: Locale, kind: ContentKind): Promise<T> {
  const key = `${kind}:${locale}`;
  if (cache.has(key)) return cache.get(key) as T;
  const data = await importWithFallback<T>(locale, kind);
  cache.set(key, data);
  return data;
}

export function loadFeherMagia(locale: Locale): Promise<FeherMagiaContent> {
  return loadCached<FeherMagiaContent>(locale, 'feher-magia');
}

/** Trait texts by key (see lib/magia/traits.ts). */
export function loadTraitTexts(locale: Locale): Promise<Record<string, TraitText>> {
  return loadCached<Record<string, TraitText>>(locale, 'tulajdonsagok');
}
