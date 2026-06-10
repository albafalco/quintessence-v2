import type { AngolLesson1Content } from '@/lib/i18n-content';

export const ALL_SECTION_IDS = [0, 1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;

export const INITIAL_UNLOCKED_SECTIONS = [0, 1, 2, 5] as const;

export function getSectionLabels(content: AngolLesson1Content): Record<number, string> {
  return content.sectionLabels;
}

export function getLessons(content: AngolLesson1Content) {
  return content.lessons;
}

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