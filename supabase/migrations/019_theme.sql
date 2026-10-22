-- 019: Megjelenés — Quintessence (sötét, alap), Hajnal (világos), Automatikus (rendszer)
-- Futtatás: Supabase SQL Editor. Többször is lefuttatható.
-- A saját profil írását a meglévő own_profile szabály engedi.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'quintessence';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_theme_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_theme_check
  CHECK (theme IN ('quintessence', 'hajnal', 'system'));
