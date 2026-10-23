-- 021: Átállás az új Fehér Mágia útra (mindenkinek)
-- Futtatás: Supabase SQL Editor. Többször is lefuttatható.
--
-- FIGYELEM: a régi modul táblái véglegesen törlődnek (régi haladás, napló,
-- régi lelki tükör). Előtte érdemes letölteni az adatmentést (Profil → Adataim).
-- A gyakorlási alkalmak (magia_sessions: sorozat, jelvények) megmaradnak.
--
-- - a régi „gyakorlat uralva” értesítés triggere és a heti jelentés függvénye törlődik
-- - a megszűnt oldalakra mutató régi csengő-értesítések törlődnek
-- - a régi táblák törlődnek: magia_progress, magia_journal, magia_soul_mirror
-- - a heti jelentés profil-oszlopai törlődnek
-- - a 'feher_magia' zárt modul megszűnik (mindenki látja az új utat)
-- - bejelentés a csengőbe és push-értesítésként, 9 nyelven

BEGIN;

-- ── 1. Régi automatizmusok ──────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.magia_progress') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS magia_progress_notify_mastered ON public.magia_progress;
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.notify_exercise_mastered();
DROP FUNCTION IF EXISTS public.create_weekly_report_notifications(DATE, TIMESTAMPTZ, TIMESTAMPTZ);

-- ── 2. Régi csengő-értesítések (megszűnt oldalakra mutatnak) ────────────────
DELETE FROM public.user_notifications WHERE kind IN ('weekly_report', 'exercise_mastered');

-- ── 3. A régi modul táblái ──────────────────────────────────────────────────
DROP TABLE IF EXISTS public.magia_journal;
DROP TABLE IF EXISTS public.magia_soul_mirror;
DROP TABLE IF EXISTS public.magia_progress;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS push_weekly_report,
  DROP COLUMN IF EXISTS last_weekly_report_date;

-- ── 4. A 'feher_magia' zárt modul megszűnik ─────────────────────────────────
DELETE FROM public.module_access WHERE module = 'feher_magia';
ALTER TABLE public.module_access DROP CONSTRAINT IF EXISTS module_access_module_check;
ALTER TABLE public.module_access
  ADD CONSTRAINT module_access_module_check CHECK (module IN ('angol'));

-- ── 5. Bejelentés (csengő + push; a push-t a következő ütemezett futás küldi) ─
INSERT INTO public.announcements (kind, title, body, translations, link_url, link_label, audience, publish_at, send_push)
SELECT
  'content',
  'Megújult a Fehér Mágia',
  'Új, egyszerűbb formában folytatódik. A Kapuval indul, utána napi gyakorlatok és esti önvizsgálat következnek. Kezdd el még ma!',
  $json${
    "en": {"title": "White Magic has been renewed", "body": "It continues in a new, simpler form. It starts with the Gate, followed by daily exercises and an evening self-examination. Start today!", "link_label": "On to the Gate"},
    "de": {"title": "Die Weiße Magie ist erneuert", "body": "Sie geht in einer neuen, einfacheren Form weiter. Sie beginnt mit dem Tor, danach folgen tägliche Übungen und die abendliche Selbstprüfung. Fang noch heute an!", "link_label": "Weiter zum Tor"},
    "es": {"title": "La Magia Blanca se ha renovado", "body": "Continúa con una forma nueva y más sencilla. Empieza con la Puerta y después vienen los ejercicios diarios y el autoexamen de la noche. ¡Empieza hoy mismo!", "link_label": "Ir a la Puerta"},
    "it": {"title": "La Magia Bianca si è rinnovata", "body": "Continua in una forma nuova e più semplice. Comincia con la Porta, poi seguono gli esercizi quotidiani e l’esame di sé serale. Inizia già oggi!", "link_label": "Vai alla Porta"},
    "pt": {"title": "A Magia Branca foi renovada", "body": "Ela continua de uma forma nova e mais simples. Começa com o Portal; depois vêm os exercícios diários e o autoexame da noite. Comece hoje mesmo!", "link_label": "Ir para o Portal"},
    "ro": {"title": "Magia Albă s-a înnoit", "body": "Continuă într-o formă nouă, mai simplă. Începe cu Poarta, apoi urmează exercițiile zilnice și autoexaminarea de seară. Începe chiar de azi!", "link_label": "Spre Poartă"},
    "sk": {"title": "Biela mágia je obnovená", "body": "Pokračuje v novej, jednoduchšej podobe. Začína sa Bránou, potom nasledujú denné cvičenia a večerné sebaskúmanie. Začni ešte dnes!", "link_label": "Na Bránu"},
    "sr": {"title": "Bela magija je obnovljena", "body": "Nastavlja se u novom, jednostavnijem obliku. Počinje Kapijom, a zatim slede svakodnevne vežbe i večernje samoispitivanje. Počni već danas!", "link_label": "Na Kapiju"}
  }$json$::JSONB,
  '/modules/magia/kapu',
  'Tovább a Kapuhoz',
  'all',
  now(),
  true
WHERE NOT EXISTS (SELECT 1 FROM public.announcements WHERE title = 'Megújult a Fehér Mágia');

COMMIT;
