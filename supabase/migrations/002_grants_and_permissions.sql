-- Run this in Supabase SQL Editor if tables were created manually.
-- Fixes missing GRANTs and ensures invite_codes is accessible by service_role.

-- Schema usage
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Table privileges (existing + future tables)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- invite_codes: no RLS (validated server-side with service_role)
ALTER TABLE invite_codes DISABLE ROW LEVEL SECURITY;

-- Ensure RLS policies have WITH CHECK for writes
DROP POLICY IF EXISTS "own_profile" ON profiles;
CREATE POLICY "own_profile" ON profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "own_magia_progress" ON magia_progress;
CREATE POLICY "own_magia_progress" ON magia_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_magia_journal" ON magia_journal;
CREATE POLICY "own_magia_journal" ON magia_journal
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_angol_card" ON angol_card_progress;
CREATE POLICY "own_angol_card" ON angol_card_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_angol_unlocks" ON angol_section_unlocks;
CREATE POLICY "own_angol_unlocks" ON angol_section_unlocks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_angol_exam" ON angol_exam_results;
CREATE POLICY "own_angol_exam" ON angol_exam_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_push" ON push_subscriptions;
CREATE POLICY "own_push" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed invite codes (safe to re-run)
INSERT INTO invite_codes (code) VALUES
  ('QUINTESSENCE2025'),
  ('MAGIC-INIT-001'),
  ('ANGOL-START-001')
ON CONFLICT (code) DO NOTHING;