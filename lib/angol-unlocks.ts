import { INITIAL_UNLOCKED_SECTIONS } from '@/lib/angol-lecke1';

export const ALL_SECTION_IDS = [0, 1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;

export const SECTION_LABELS: Record<number, string> = {
  0: 'Szólap',
  1: 'Szólap Magyarázat',
  2: 'Nyelvtan I',
  5: 'Gyakorló A — Alapkapcsolások',
  6: 'Gyakorló — Határozatlan Névelő',
  7: 'Gyakorló — Határozott Névelő',
  8: 'Gyakorló — Mutató Névmások',
  9: 'Gyakorló — Birtokos Névmások',
  10: 'Gyakorló — Egyéb Kapcsolások',
  11: 'Mondatrész Gyakorló Vegyes',
  12: 'Mondat Gyakorló — Ez + Egyéb',
  13: 'Mondat Gyakorló — Ez + ABC',
  14: 'Mondat Gyakorló — Ő + Egyéb',
  15: 'Mondat Gyakorló — Ő + ABC',
  16: 'Mondat Gyakorló — ABC + Egyéb',
  17: 'Mondat Gyakorló — ABC + ABC',
  18: 'Mondat Gyakorló Vegyes',
};

export const LESSONS = [
  { id: 1, title: 'I. Lecke', subtitle: 'Alapok — névelők, névmások, mondatok' },
  { id: 2, title: 'II. Lecke', subtitle: 'Hamarosan' },
  { id: 3, title: 'III. Lecke', subtitle: 'Hamarosan' },
  { id: 4, title: 'IV. Lecke', subtitle: 'Hamarosan' },
  { id: 5, title: 'V. Lecke', subtitle: 'Hamarosan' },
  { id: 6, title: 'VI. Lecke', subtitle: 'Hamarosan' },
  { id: 7, title: 'VII. Lecke', subtitle: 'Hamarosan' },
  { id: 8, title: 'VIII. Lecke', subtitle: 'Hamarosan' },
  { id: 9, title: 'IX. Lecke', subtitle: 'Hamarosan' },
  { id: 10, title: 'X. Lecke', subtitle: 'Hamarosan' },
] as const;

export function getNextSectionId(sectionId: number): number | null {
  const practiceIds = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const index = practiceIds.indexOf(sectionId);
  if (index === -1 || index === practiceIds.length - 1) return null;
  return practiceIds[index + 1];
}

export function isSectionUnlocked(
  sectionId: number,
  unlockedIds: number[]
): boolean {
  if ((INITIAL_UNLOCKED_SECTIONS as readonly number[]).includes(sectionId)) {
    return true;
  }
  return unlockedIds.includes(sectionId);
}

export function mergeUnlockedSections(dbUnlocks: number[]): number[] {
  const merged = new Set<number>([...INITIAL_UNLOCKED_SECTIONS, ...dbUnlocks]);
  return Array.from(merged).sort((a, b) => a - b);
}