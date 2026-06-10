import type { Locale } from '@/i18n';
import type { Exercise, MagiaSection } from '@/lib/magia-types';

export interface FokozatSection {
  cim: string;
  leiras: string;
  gyakorlatok: Exercise[];
}

export interface FokozatData {
  id: number;
  cim: string;
  rovidcim: string;
  icon: string;
  szin: string;
  szellem: FokozatSection;
  lelek: FokozatSection;
  test: FokozatSection;
  idotartam: string;
  osszefoglalo: string;
}

export interface MondatPair {
  prompt: string;
  answer: string;
}

export interface AngolSzakasz {
  id: number;
  nev: string;
  tipus: 'mondatresz' | 'mondat';
  mondatok: MondatPair[];
}

export interface AngolLesson1Content {
  sections: Record<number, string>;
  practice: AngolSzakasz[];
  sectionLabels: Record<number, string>;
  lessons: { id: number; title: string; subtitle: string }[];
}

export type GrammarBlock =
  | { type: 'paragraph'; html: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'note'; paragraphs: string[] }
  | { type: 'mono'; lines: string[] };

export interface GrammarPage {
  title: string;
  intro: string;
  sections: { heading: string; blocks: GrammarBlock[] }[];
}

export interface AngolGrammarContent {
  szolapMagyarazat: GrammarPage;
  nyelvtanI: GrammarPage;
}

type ContentKind =
  | 'magia'
  | 'angol-vocabulary'
  | 'angol-lesson1'
  | 'angol-lesson1-labels'
  | 'angol-grammar';

const cache = new Map<string, unknown>();

async function importContent<T>(locale: Locale, kind: ContentKind): Promise<T> {
  const mod = await import(`@/messages/content/${kind}.${locale}.json`);
  return mod.default as T;
}

export async function loadMagiaFokozatok(locale: Locale): Promise<FokozatData[]> {
  const key = `magia:${locale}`;
  if (cache.has(key)) return cache.get(key) as FokozatData[];

  try {
    const data = await importContent<FokozatData[]>(locale, 'magia');
    cache.set(key, data);
    return data;
  } catch {
    const data = await importContent<FokozatData[]>('hu', 'magia');
    cache.set(key, data);
    return data;
  }
}

export async function loadAngolVocabulary(): Promise<MondatPair[]> {
  const key = 'angol-vocabulary';
  if (cache.has(key)) return cache.get(key) as MondatPair[];

  const raw = await import('@/messages/content/angol-vocabulary.json');
  const data = (raw.default as { prompt: string; answer: string }[]).map((item) => ({
    prompt: item.prompt,
    answer: item.answer,
  }));
  cache.set(key, data);
  return data;
}

export async function loadAngolLesson1(locale: Locale): Promise<AngolLesson1Content> {
  const key = `angol-lesson1:${locale}`;
  if (cache.has(key)) return cache.get(key) as AngolLesson1Content;

  const [practiceMod, labelsMod] = await Promise.all([
    import('@/messages/content/angol-lesson1.json'),
    importContent<Pick<AngolLesson1Content, 'sections' | 'sectionLabels' | 'lessons'>>(locale, 'angol-lesson1-labels').catch(
      () => importContent<Pick<AngolLesson1Content, 'sections' | 'sectionLabels' | 'lessons'>>('hu', 'angol-lesson1-labels')
    ),
  ]);

  const practiceRaw = practiceMod.default as {
    practice: { id: number; nev: string; tipus: 'mondatresz' | 'mondat'; mondatok: { hu?: string; en?: string; prompt?: string; answer?: string }[] }[];
  };

  const practice: AngolSzakasz[] = practiceRaw.practice.map((szakasz) => ({
    id: szakasz.id,
    nev: labelsMod.sections[szakasz.id] ?? szakasz.nev,
    tipus: szakasz.tipus,
    mondatok: szakasz.mondatok.map((m) => ({
      prompt: m.prompt ?? m.hu ?? '',
      answer: m.answer ?? m.en ?? '',
    })),
  }));

  const data: AngolLesson1Content = {
    sections: labelsMod.sections,
    sectionLabels: labelsMod.sectionLabels,
    lessons: labelsMod.lessons,
    practice,
  };

  cache.set(key, data);
  return data;
}

export async function loadAngolGrammar(locale: Locale): Promise<AngolGrammarContent> {
  const key = `angol-grammar:${locale}`;
  if (cache.has(key)) return cache.get(key) as AngolGrammarContent;

  try {
    const data = await importContent<AngolGrammarContent>(locale, 'angol-grammar');
    cache.set(key, data);
    return data;
  } catch {
    const data = await importContent<AngolGrammarContent>('hu', 'angol-grammar');
    cache.set(key, data);
    return data;
  }
}

export function getFokozatExerciseCount(fokozat: FokozatData): number {
  return (
    fokozat.szellem.gyakorlatok.length +
    fokozat.lelek.gyakorlatok.length +
    fokozat.test.gyakorlatok.length
  );
}

export async function getTotalMagiaExercises(locale: Locale): Promise<number> {
  const fokozatok = await loadMagiaFokozatok(locale);
  return fokozatok.reduce((sum, f) => sum + getFokozatExerciseCount(f), 0);
}

export type { MagiaSection };