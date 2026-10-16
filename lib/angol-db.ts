import { createClient } from '@/lib/supabase/server';
import { mergeUnlockedSections } from '@/lib/angol-unlocks';

export async function getUnlockedSectionIds(
  lessonId: number
): Promise<number[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return mergeUnlockedSections([]);

  const { data } = await supabase
    .from('angol_section_unlocks')
    .select('section_id')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId);

  const ids = (data ?? []).map((row) => row.section_id as number);
  return mergeUnlockedSections(ids);
}

export async function getLastExamResult(
  lessonId: number,
  sectionId: number
): Promise<{ score: number; passed: boolean } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('angol_exam_results')
    .select('score, passed')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .eq('section_id', sectionId)
    .order('taken_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { score: Number(data.score), passed: data.passed };
}
/** Number of items in the "Nehéz mondatok" list (0 before migration 009). */
export async function getHardItemCount(lessonId: number): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('angol_hard_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId);
  return error ? 0 : (count ?? 0);
}
