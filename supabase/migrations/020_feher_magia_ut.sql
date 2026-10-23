-- 020: Az új Fehér Mágia út (Kovács-Magyar András, I–III. fokozat)
-- Futtatás: Supabase SQL Editor. Többször is lefuttatható.
--
-- - magia_path: az út állapota (Kapu, fokozat, óhaj, gondolatgyakorlat, légzés,
--   a test iskolázásának tételei), felhasználónként egy sor
-- - magia_cycles: 14 napos ciklusok, lezáráskor az összesítő (a két lélektükör)
-- - magia_evenings: az esti önvizsgálat, egy sor egy este
-- - magia_user_traits: a felhasználó által hozzáadott tulajdonságok
--   (a szótárból kulccsal, vagy saját szóként)
-- - magia_day_notes: a napközbeni „+” jegyzetek
-- - magia_sessions: két új mező (a „Sikerült?” válasz, a lélegzetszám)
--
-- Minden új táblát csak a saját tulajdonosa olvashat és írhat; a felhasználó
-- törlésekor a sorai vele együtt törlődnek.

-- ── 1. Az út állapota ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.magia_path (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- A Kapu (a 189. oldal) elolvasásának ideje; NULL = még a Kapu előtt áll
  gate_read_at TIMESTAMPTZ,
  fokozat SMALLINT NOT NULL DEFAULT 1 CHECK (fokozat BETWEEN 1 AND 3),
  fokozat_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Az óhaj (légzés, étkezés, víz); egyszerre egy
  wish TEXT CHECK (char_length(wish) BETWEEN 1 AND 80),
  wish_set_at TIMESTAMPTZ,
  -- Gondolatgyakorlat: 0 = megfigyelés, 1 = fegyelmezés, 2 = üresség, 3 = mind uralva
  thought_stage SMALLINT NOT NULL DEFAULT 0 CHECK (thought_stage BETWEEN 0 AND 3),
  thought_minutes SMALLINT NOT NULL DEFAULT 1 CHECK (thought_minutes BETWEEN 1 AND 10),
  thought_wins SMALLINT NOT NULL DEFAULT 0 CHECK (thought_wins >= 0),   -- egymás utáni sikerek 10 percnél
  thought_fails SMALLINT NOT NULL DEFAULT 0 CHECK (thought_fails >= 0), -- egymás utáni sikertelen alkalmak
  thought_raised_on DATE,                                               -- naponta legfeljebb +1 perc
  thought_focus TEXT CHECK (char_length(thought_focus) BETWEEN 1 AND 120), -- a fegyelmezés gondolata
  -- Tudatos légzés: a lélegzetek célszáma, naponta +1
  breath_target SMALLINT NOT NULL DEFAULT 7 CHECK (breath_target BETWEEN 1 AND 300),
  breath_raised_on DATE,
  -- A test iskolázása: [{ "key", "label"?, "when": "reggel|napkozben|este", "days": null | [0..6] }]
  body_plan JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(body_plan) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. 14 napos ciklusok ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.magia_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- onismeret = I. fokozat (megfigyelés), munka = II. fokozattól (fókusz)
  kind TEXT NOT NULL DEFAULT 'onismeret' CHECK (kind IN ('onismeret', 'munka')),
  number SMALLINT NOT NULL CHECK (number >= 1),
  fokozat SMALLINT NOT NULL CHECK (fokozat BETWEEN 1 AND 3),
  -- Gyakorlási napok száma; az őszinteség-jelzésnél +7
  length_days SMALLINT NOT NULL DEFAULT 14 CHECK (length_days BETWEEN 1 AND 60),
  started_on DATE NOT NULL,
  closed_at TIMESTAMPTZ,
  -- Lezáráskor: { "<kulcs>": { "avg": 2.4, "level": 2 }, ... }
  summary JSONB,
  -- A felhasználó erősség-rendezése: { "<kulcs>": 0..3 }
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, number)
);
CREATE INDEX IF NOT EXISTS magia_cycles_user_idx ON public.magia_cycles (user_id, number DESC);

-- ── 3. Esti önvizsgálat ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.magia_evenings (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obs_date DATE NOT NULL,
  cycle_id UUID REFERENCES public.magia_cycles(id) ON DELETE SET NULL,
  -- Csak a jelöltek: { "<kulcs>": 1 | 2 | 3 | "?" }; ami nincs benne, az „nem jellemző”
  ratings JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(ratings) = 'object'),
  -- Hol tart az este (megszakítás utáni folytatáshoz)
  step SMALLINT NOT NULL DEFAULT 0 CHECK (step >= 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, obs_date)
);
CREATE INDEX IF NOT EXISTS magia_evenings_cycle_idx ON public.magia_evenings (cycle_id);

-- ── 4. Hozzáadott tulajdonságok ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.magia_user_traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mirror TEXT NOT NULL CHECK (mirror IN ('fekete', 'feher')),
  -- Vagy szótári szó (kulccsal), vagy saját szó (névvel) — pontosan az egyik
  trait_key TEXT CHECK (trait_key ~ '^[a-z0-9_]{2,60}$'),
  name TEXT CHECK (char_length(name) BETWEEN 2 AND 60),
  -- NULL = Besorolatlan (csak saját szónál)
  element TEXT CHECK (element IN ('tuz', 'levego', 'viz', 'fold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((trait_key IS NULL) <> (name IS NULL)),
  UNIQUE (user_id, trait_key)
);

-- ── 5. Napközbeni jegyzetek ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.magia_day_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obs_date DATE NOT NULL,
  -- Alaplista- vagy szótárkulcs, saját szónál 'own:<uuid>'
  trait_key TEXT NOT NULL CHECK (char_length(trait_key) BETWEEN 2 AND 80),
  note TEXT CHECK (char_length(note) <= 500),
  noted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS magia_day_notes_user_date_idx ON public.magia_day_notes (user_id, obs_date);

-- ── 6. Gyakorlási alkalmak: két új mező ─────────────────────────────────────
ALTER TABLE public.magia_sessions
  ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('igen', 'reszben', 'nem')),
  ADD COLUMN IF NOT EXISTS reps INT CHECK (reps >= 0);

-- ── 7. Jogosultságok: mindenki csak a sajátját ──────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['magia_path', 'magia_cycles', 'magia_evenings', 'magia_user_traits', 'magia_day_notes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'own_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      'own_' || t, t
    );
  END LOOP;
END $$;
