-- 015: "Megszólítás" — how the app addresses the user on the dashboard
-- ("Szia, {display_name}!"). Empty → the app falls back to "@username".
-- Covered by the existing own_profile RLS policy (read + update own row).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_display_name_length;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_length
  CHECK (display_name IS NULL OR char_length(btrim(display_name)) BETWEEN 1 AND 40);
