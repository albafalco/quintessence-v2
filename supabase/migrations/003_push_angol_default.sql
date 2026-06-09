-- Angol push emlékeztető: alapértelmezett 20:00 (Budapest), napi duplikáció elkerülése
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_angol_push_date TEXT;

ALTER TABLE profiles
  ALTER COLUMN push_angol_time SET DEFAULT '20:00';

UPDATE profiles
SET push_angol_time = '20:00'
WHERE push_angol_time IS NULL OR push_angol_time = '18:00';