-- 006: megbízható push-ütemezés (pg_cron + pg_net) és angol gyakorló-aktivitás
--
-- A GitHub Actions ütemezés naponta csak ~15-ször futott (névleg 288), és
-- 60 nap inaktivitás után a GitHub le is tiltja. Helyette a Supabase hívja
-- 5 percenként a /api/push/send végpontot.
--
-- FUTTATÁS ELŐTT egyszer, a SQL Editorban (a titok NE kerüljön a repóba!):
--   select vault.create_secret('<CRON_SECRET értéke a Vercelről>', 'cron_secret');
-- Ha már létezik és cserélni kell:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'cron_secret'),
--     '<új érték>'
--   );

-- Angol gyakorló mód aktivitása (a push "ma még nem gyakoroltál" ellenőrzéséhez)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_angol_activity_date TEXT;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Korábbi ütemezés eltávolítása (újrafuttathatóság)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'push-reminders';

SELECT cron.schedule(
  'push-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://quintessence-v2.vercel.app/api/push/send',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- Ellenőrzés:
--   select * from cron.job;
--   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
--   select status_code, content from net._http_response order by created desc limit 10;
