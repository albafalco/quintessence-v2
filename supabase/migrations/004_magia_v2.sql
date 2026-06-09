-- Mágia modul v2: munkamenetek, lelki tükör, haladás bővítés

-- Munkamenet-napló (timer + post-session naplózás)
CREATE TABLE magia_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fokozat INT NOT NULL CHECK (fokozat BETWEEN 1 AND 10),
  section TEXT NOT NULL CHECK (section IN ('szellem', 'lelek', 'test')),
  exercise_key TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_sec INT,
  target_sec INT,
  completed BOOLEAN DEFAULT false,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  disturbances TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lelki tükör tételek (1. fokozat lélekiskolázás + 2. fokozat jellemnemesítés)
CREATE TABLE magia_soul_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mirror TEXT NOT NULL CHECK (mirror IN ('fekete', 'feher')),
  trait TEXT NOT NULL,
  element TEXT CHECK (element IN ('tuz', 'levego', 'viz', 'fold')),
  intensity INT NOT NULL DEFAULT 1 CHECK (intensity BETWEEN 1 AND 3),
  work_method TEXT CHECK (work_method IN ('uralas', 'autoszuggeszcio', 'transzmutacio')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- magia_progress bővítése: uraltság státusz és munkamenet-számláló
ALTER TABLE magia_progress
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'mastered')),
  ADD COLUMN IF NOT EXISTS mastered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_count INT NOT NULL DEFAULT 0;

-- Meglévő completed=true sorok átmigrálása mastered státuszra
UPDATE magia_progress
  SET status = 'mastered', mastered_at = COALESCE(completed_at, now())
  WHERE completed = true;

-- magia_journal bővítése: strukturált mezők + session-kapcsolat
ALTER TABLE magia_journal
  ADD COLUMN IF NOT EXISTS section TEXT CHECK (section IN ('szellem', 'lelek', 'test')),
  ADD COLUMN IF NOT EXISTS exercise_key TEXT,
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES magia_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS successes TEXT,
  ADD COLUMN IF NOT EXISTS failures TEXT,
  ADD COLUMN IF NOT EXISTS duration_sec INT,
  ADD COLUMN IF NOT EXISTS disturbances TEXT,
  ADD COLUMN IF NOT EXISTS self_criticism TEXT,
  ADD COLUMN IF NOT EXISTS next_plan TEXT;

-- profiles bővítése: esti emlékeztető + sorozatvédő + visszahívó kapcsolók
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_magia_evening BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_magia_evening_time TEXT DEFAULT '19:00',
  ADD COLUMN IF NOT EXISTS push_magia_streak BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_magia_streak_time TEXT DEFAULT '20:30',
  ADD COLUMN IF NOT EXISTS push_magia_reengagement BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_magia_push_date TEXT,
  ADD COLUMN IF NOT EXISTS last_magia_reengagement_date TEXT,
  ADD COLUMN IF NOT EXISTS last_magia_activity_date TEXT;

-- RLS az új táblákra
ALTER TABLE magia_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE magia_soul_mirror ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_magia_sessions" ON magia_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_magia_soul_mirror" ON magia_soul_mirror
  FOR ALL USING (auth.uid() = user_id);
