-- Esti és streak push értesítők napi dedup mezői
-- A reggeli (last_magia_push_date) és angol (last_angol_push_date) dedup már létezik.
-- Az esti és streak emlékeztetők eddig dedup nélkül küldtek — 30 perces ablakban
-- többször is elküldhette. Ez a két oszlop megakadályozza a dupla küldést.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_magia_evening_push_date TEXT,
  ADD COLUMN IF NOT EXISTS last_magia_streak_push_date TEXT;
