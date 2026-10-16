import type { MondatPair } from '@/lib/i18n-content';

/** New (never seen) vocabulary cards introduced per day in the review queue. */
export const NEW_CARDS_PER_DAY = 10;

export interface CardScheduleRow {
  word_hu: string;
  due_on: string | null;
  introduced_on: string | null;
}

/**
 * Today's review queue: cards that are due (oldest first), then up to
 * NEW_CARDS_PER_DAY unseen cards in vocabulary order (minus those already
 * introduced today).
 */
export function buildReviewQueue(vocabulary: MondatPair[], rows: CardScheduleRow[], today: string): MondatPair[] {
  const byWord = new Map(rows.map((r) => [r.word_hu, r]));
  const due = vocabulary
    .filter((card) => {
      const row = byWord.get(card.prompt);
      return row?.due_on != null && row.due_on <= today;
    })
    .sort((a, b) => byWord.get(a.prompt)!.due_on!.localeCompare(byWord.get(b.prompt)!.due_on!));
  const introducedToday = rows.filter((r) => r.introduced_on === today).length;
  const newLimit = Math.max(0, NEW_CARDS_PER_DAY - introducedToday);
  const fresh = vocabulary.filter((card) => !byWord.has(card.prompt)).slice(0, newLimit);
  return [...due, ...fresh];
}

/** Size of today's review queue without needing the vocabulary contents. */
export function countReviewQueue(vocabularySize: number, rows: CardScheduleRow[], today: string): number {
  const due = rows.filter((r) => r.due_on != null && r.due_on <= today).length;
  const introducedToday = rows.filter((r) => r.introduced_on === today).length;
  const unseen = Math.max(0, vocabularySize - rows.length);
  return due + Math.min(unseen, Math.max(0, NEW_CARDS_PER_DAY - introducedToday));
}
