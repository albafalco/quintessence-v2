import { createClient } from '@/lib/supabase/client';

export interface HardItemInput {
  lessonId: number;
  sectionId: number;
  kind: 'sentence' | 'word';
  prompt: string;
  answer: string;
}

export interface HardItem {
  id: string;
  lesson_id: number;
  section_id: number;
  kind: 'sentence' | 'word';
  prompt: string;
  answer: string;
  wrong_count: number;
  correct_streak: number;
}

/** Number of correct answers in a row after which an item leaves the list (see migration 009). */
export const HARD_ITEM_STREAK_TO_CLEAR = 3;

/**
 * Adds wrongly answered items to the "Nehéz mondatok" list. Best-effort: until
 * migration 009 is run the function does not exist and this silently does nothing.
 */
export async function recordHardItems(items: HardItemInput[]): Promise<void> {
  if (items.length === 0) return;
  const supabase = createClient();
  for (const item of items) {
    const { error } = await supabase.rpc('record_angol_hard_item', {
      p_lesson_id: item.lessonId,
      p_section_id: item.sectionId,
      p_kind: item.kind,
      p_prompt: item.prompt,
      p_answer: item.answer,
    });
    if (error) {
      if (error.code !== 'PGRST202') console.error('[angol] recording hard item failed', error);
      return;
    }
  }
}
