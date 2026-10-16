-- 007: atomikus szókártya-számláló
--
-- A kliens eddig kiolvasta a correct/incorrect számlálót, majd felülírta —
-- gyors egymás utáni kattintásnál így elveszhetett egy-egy találat.
-- Ez a függvény egyetlen INSERT ... ON CONFLICT utasítással növel.
--
-- SECURITY INVOKER: a hívó felhasználó jogaival fut, így az RLS
-- ("own_angol_card") továbbra is érvényes; a user_id mindig auth.uid().

CREATE OR REPLACE FUNCTION public.increment_angol_card(
  p_lesson_id INT,
  p_word_hu TEXT,
  p_word_en TEXT,
  p_correct BOOLEAN
)
RETURNS VOID
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO angol_card_progress (user_id, lesson_id, word_hu, word_en, correct_count, incorrect_count, last_seen)
  VALUES (
    auth.uid(),
    p_lesson_id,
    p_word_hu,
    p_word_en,
    CASE WHEN p_correct THEN 1 ELSE 0 END,
    CASE WHEN p_correct THEN 0 ELSE 1 END,
    now()
  )
  ON CONFLICT (user_id, lesson_id, word_hu) DO UPDATE SET
    word_en = EXCLUDED.word_en,
    correct_count = angol_card_progress.correct_count + EXCLUDED.correct_count,
    incorrect_count = angol_card_progress.incorrect_count + EXCLUDED.incorrect_count,
    last_seen = now();
$$;

REVOKE ALL ON FUNCTION public.increment_angol_card(INT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_angol_card(INT, TEXT, TEXT, BOOLEAN) TO authenticated;
