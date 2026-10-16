-- 009: Kreatív Angol — "Nehéz mondatok" + ismétlési rendszer (spaced repetition)
--
-- Az app a migráció lefuttatása előtt is működik; az új funkciók utána
-- teljesek. Minden függvény SECURITY INVOKER: a hívó jogaival fut, az RLS
-- érvényes, a user_id mindig auth.uid().

-- ── 1. Nehéz mondatok ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS angol_hard_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INT NOT NULL,
  section_id INT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'sentence' CHECK (kind IN ('sentence', 'word')),
  prompt TEXT NOT NULL,          -- magyar
  answer TEXT NOT NULL,          -- angol (helyes válasz)
  wrong_count INT NOT NULL DEFAULT 1,
  correct_streak INT NOT NULL DEFAULT 0,
  last_wrong_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id, prompt)
);

ALTER TABLE angol_hard_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_angol_hard_items" ON angol_hard_items;
CREATE POLICY "own_angol_hard_items" ON angol_hard_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON angol_hard_items TO authenticated;

-- Hibás válasz rögzítése: új tétel, vagy a meglévő hibaszáma nő
CREATE OR REPLACE FUNCTION public.record_angol_hard_item(
  p_lesson_id INT,
  p_section_id INT,
  p_kind TEXT,
  p_prompt TEXT,
  p_answer TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO angol_hard_items (user_id, lesson_id, section_id, kind, prompt, answer)
  VALUES (auth.uid(), p_lesson_id, p_section_id, p_kind, p_prompt, p_answer)
  ON CONFLICT (user_id, lesson_id, prompt) DO UPDATE SET
    wrong_count = angol_hard_items.wrong_count + 1,
    correct_streak = 0,
    last_wrong_at = now(),
    answer = EXCLUDED.answer;
$$;

-- Gyakorlásban adott válasz: 3 egymás utáni helyes után a tétel törlődik.
-- Visszatér: true, ha a tétel kikerült a listából.
CREATE OR REPLACE FUNCTION public.answer_angol_hard_item(p_id UUID, p_correct BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_streak INT;
BEGIN
  IF p_correct THEN
    UPDATE angol_hard_items
      SET correct_streak = correct_streak + 1
      WHERE id = p_id AND user_id = auth.uid()
      RETURNING correct_streak INTO v_streak;
    IF v_streak >= 3 THEN
      DELETE FROM angol_hard_items WHERE id = p_id AND user_id = auth.uid();
      RETURN TRUE;
    END IF;
  ELSE
    UPDATE angol_hard_items
      SET correct_streak = 0, wrong_count = wrong_count + 1, last_wrong_at = now()
      WHERE id = p_id AND user_id = auth.uid();
  END IF;
  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_angol_hard_item(INT, INT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.answer_angol_hard_item(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_angol_hard_item(INT, INT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.answer_angol_hard_item(UUID, BOOLEAN) TO authenticated;

-- ── 2. Szókártya-ismétlés (SM-2 jellegű) ────────────────────────────────────

ALTER TABLE angol_card_progress
  ADD COLUMN IF NOT EXISTS due_on DATE,                 -- következő ismétlés napja (Budapest)
  ADD COLUMN IF NOT EXISTS interval_days INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ease NUMERIC(4, 2) NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS introduced_on DATE;          -- mikor került be először

-- Átállás: a már tudott szavak (>= 3 helyes) hosszabb időközt kapnak, 1–7 napra
-- szétszórva, hogy ne egyszerre jöjjenek; a többi a mai napon esedékes.
UPDATE angol_card_progress
  SET interval_days = 7,
      due_on = (now() AT TIME ZONE 'Europe/Budapest')::date + (abs(hashtext(word_hu)) % 7) + 1,
      introduced_on = COALESCE((last_seen AT TIME ZONE 'Europe/Budapest')::date, (now() AT TIME ZONE 'Europe/Budapest')::date)
  WHERE due_on IS NULL AND correct_count >= 3;

UPDATE angol_card_progress
  SET interval_days = 1,
      due_on = (now() AT TIME ZONE 'Europe/Budapest')::date,
      introduced_on = COALESCE((last_seen AT TIME ZONE 'Europe/Budapest')::date, (now() AT TIME ZONE 'Europe/Budapest')::date)
  WHERE due_on IS NULL;

-- A 007-es számláló függvény bővítése az ütemezéssel (azonos aláírás).
--   Tudom:          1 → 3 → időköz × könnyűség (≈ 7 → 18 → 47 nap), könnyűség +0,05
--   Még gyakorlom:  holnap újra, időköz 1, könnyűség −0,2 (min. 1,3)
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
  INSERT INTO angol_card_progress (
    user_id, lesson_id, word_hu, word_en, correct_count, incorrect_count, last_seen,
    interval_days, ease, due_on, introduced_on
  )
  VALUES (
    auth.uid(), p_lesson_id, p_word_hu, p_word_en,
    CASE WHEN p_correct THEN 1 ELSE 0 END,
    CASE WHEN p_correct THEN 0 ELSE 1 END,
    now(),
    1,
    CASE WHEN p_correct THEN 2.55 ELSE 2.3 END,
    (now() AT TIME ZONE 'Europe/Budapest')::date + 1,
    (now() AT TIME ZONE 'Europe/Budapest')::date
  )
  ON CONFLICT (user_id, lesson_id, word_hu) DO UPDATE SET
    word_en = EXCLUDED.word_en,
    correct_count = angol_card_progress.correct_count + EXCLUDED.correct_count,
    incorrect_count = angol_card_progress.incorrect_count + EXCLUDED.incorrect_count,
    last_seen = now(),
    introduced_on = COALESCE(angol_card_progress.introduced_on, EXCLUDED.introduced_on),
    interval_days = CASE
      WHEN NOT p_correct THEN 1
      WHEN angol_card_progress.interval_days <= 0 THEN 1
      WHEN angol_card_progress.interval_days = 1 THEN 3
      ELSE GREATEST(angol_card_progress.interval_days + 1,
                    FLOOR(angol_card_progress.interval_days * angol_card_progress.ease)::INT)
    END,
    ease = CASE
      WHEN p_correct THEN LEAST(3.0, angol_card_progress.ease + 0.05)
      ELSE GREATEST(1.3, angol_card_progress.ease - 0.2)
    END,
    due_on = (now() AT TIME ZONE 'Europe/Budapest')::date + CASE
      WHEN NOT p_correct THEN 1
      WHEN angol_card_progress.interval_days <= 0 THEN 1
      WHEN angol_card_progress.interval_days = 1 THEN 3
      ELSE GREATEST(angol_card_progress.interval_days + 1,
                    FLOOR(angol_card_progress.interval_days * angol_card_progress.ease)::INT)
    END;
$$;

REVOKE ALL ON FUNCTION public.increment_angol_card(INT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_angol_card(INT, TEXT, TEXT, BOOLEAN) TO authenticated;
