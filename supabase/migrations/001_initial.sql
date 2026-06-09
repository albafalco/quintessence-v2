-- Meghívókódok
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Felhasználói profilok
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'hu' CHECK (preferred_language IN ('hu','en','de','es','it')),
  push_enabled BOOLEAN DEFAULT false,
  push_magia_reminders BOOLEAN DEFAULT true,
  push_angol_reminders BOOLEAN DEFAULT true,
  push_magia_time TEXT DEFAULT '08:00',
  push_angol_time TEXT DEFAULT '18:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Push feliratkozások
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mágia modul: fokozat haladás
CREATE TABLE magia_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fokozat INT NOT NULL CHECK (fokozat BETWEEN 1 AND 10),
  section TEXT NOT NULL CHECK (section IN ('szellem', 'lelek', 'test')),
  exercise_key TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, fokozat, section, exercise_key)
);

-- Mágia modul: mágikus napló
CREATE TABLE magia_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fokozat INT CHECK (fokozat BETWEEN 1 AND 10),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Angol modul: szókártya haladás
CREATE TABLE angol_card_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INT NOT NULL DEFAULT 1,
  word_hu TEXT NOT NULL,
  word_en TEXT NOT NULL,
  correct_count INT DEFAULT 0,
  incorrect_count INT DEFAULT 0,
  last_seen TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id, word_hu)
);

-- Angol modul: szakasz feloldás
CREATE TABLE angol_section_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INT NOT NULL,
  section_id INT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id, section_id)
);

-- Angol modul: vizsga eredmények
CREATE TABLE angol_exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INT NOT NULL,
  section_id INT NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  taken_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE magia_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE magia_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE angol_card_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE angol_section_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE angol_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own_magia_progress" ON magia_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_magia_journal" ON magia_journal FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_angol_card" ON angol_card_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_angol_unlocks" ON angol_section_unlocks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_angol_exam" ON angol_exam_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_push" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

INSERT INTO invite_codes (code) VALUES
  ('QUINTESSENCE2025'),
  ('MAGIC-INIT-001'),
  ('ANGOL-START-001');