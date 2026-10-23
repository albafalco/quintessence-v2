import vocabulary from '@/messages/content/angol-vocabulary.json';
import { ALL_SECTION_IDS, INITIAL_UNLOCKED_SECTIONS } from '@/lib/angol-unlocks';
import { toIntlLocale } from '@/i18n';

const VOCABULARY = vocabulary as { prompt: string; answer: string }[];

interface AngolCardRow {
  correct_count: number;
  last_seen: string | null;
}

interface AngolUnlockRow {
  section_id: number;
  unlocked_at: string;
}


export function getAngolDashboardStats(
  cards: AngolCardRow[],
  unlocks: AngolUnlockRow[]
) {
  const learnedCards = cards.filter((c) => c.correct_count >= 3).length;
  const cardPercent = VOCABULARY.length > 0 ? Math.round((learnedCards / VOCABULARY.length) * 100) : 0;

  // Only sections opened by passing an exam count — the starting ones are free
  const initial = INITIAL_UNLOCKED_SECTIONS as readonly number[];
  const earnedSections = unlocks.filter((u) => !initial.includes(u.section_id)).length;
  const earnableSections = ALL_SECTION_IDS.length - initial.length;
  const sectionPercent = Math.round((earnedSections / earnableSections) * 100);

  const progress = Math.round((cardPercent + sectionPercent) / 2);

  const lastCard = cards
    .map((c) => c.last_seen)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const lastUnlock = unlocks
    .map((u) => u.unlocked_at)
    .sort()
    .reverse()[0];

  const lastActivity =
    [lastCard, lastUnlock].filter(Boolean).sort().reverse()[0] ?? null;

  return {
    progress,
    lastActivity,
  };
}

export function formatActivityDate(dateStr: string | null, locale: string): string | null {
  if (!dateStr) return null;
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr));
}