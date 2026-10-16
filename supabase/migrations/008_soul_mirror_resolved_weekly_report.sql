-- 008: lelki tükör feloldási időpont + heti beavatási jelentés
--
-- Az app a migráció lefuttatása előtt is működik (ezekre az oszlopokra
-- tűrően hivatkozik), de az új funkciók csak utána teljesek.

-- Lelki tükör: mikor lett egy tétel feldolgozva (heti/havi fejlődéshez)
ALTER TABLE magia_soul_mirror
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Már feldolgozott tételek: a legjobb közelítés az utolsó módosítás ideje
UPDATE magia_soul_mirror
  SET resolved_at = updated_at
  WHERE resolved = true AND resolved_at IS NULL;

-- Heti jelentés push: kapcsoló + napi/heti dedup
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_weekly_report BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_weekly_report_date TEXT;
