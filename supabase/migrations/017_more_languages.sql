-- 017: További nyelvek (pt, ro, sk, sr) — a profil nyelve nem fix listából jön
-- Futtatás: Supabase SQL Editor. Többször is lefuttatható.
--
-- A régi ellenőrzés csak hu/en/de/es/it-et engedett. Helyette csak a formátumot
-- nézzük (pl. "pt", "sr", "pt-BR"); hogy melyik nyelv támogatott, azt az app
-- dönti el (ismeretlen kódnál a magyarra esik vissza), így új nyelvhez nem kell
-- többé migráció.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_language_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_language_check
  CHECK (preferred_language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$');
