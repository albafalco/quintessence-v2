-- 010: fióktörlés lehetővé tétele + jelvények (mérföldkövek)
--
-- Az app a migráció lefuttatása előtt is működik; a fióktörlés és a
-- jelvények dátumának tárolása utána teljes.

-- ── 1. Fióktörlés ───────────────────────────────────────────────────────────
-- invite_codes.used_by eddig ON DELETE nélkül hivatkozott a felhasználóra, ami
-- meghiúsította a meghívókóddal regisztrált fiókok törlését. Törléskor most
-- kiürül (a kód felhasznált marad, nem válik újra érvényessé).
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
    WHERE con.conrelid = 'public.invite_codes'::regclass
      AND con.contype = 'f'
      AND att.attname = 'used_by'
  LOOP
    EXECUTE format('ALTER TABLE public.invite_codes DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.invite_codes
  ADD CONSTRAINT invite_codes_used_by_fkey
  FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2. Jelvények ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_user_badges" ON user_badges;
CREATE POLICY "own_user_badges" ON user_badges
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT ON user_badges TO authenticated;
