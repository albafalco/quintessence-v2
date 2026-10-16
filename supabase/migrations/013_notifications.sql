-- 013: Értesítések – közlemények (admin) + személyes, automatikus értesítések
-- Futtatás: Supabase SQL Editor. Többször is lefuttatható.
-- Az új táblákon a 002-es alapértelmezett jogokat visszavonjuk (lásd 011).

-- ── 1. Közlemények ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('news', 'content', 'system')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  -- Fordítások: {"en": {"title": "...", "body": "...", "link_label": "..."}, ...}
  translations JSONB NOT NULL DEFAULT '{}'::JSONB,
  link_url TEXT,
  link_label TEXT,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'hu')),
  publish_at TIMESTAMPTZ,            -- NULL = piszkozat
  expires_at TIMESTAMPTZ,
  send_push BOOLEAN NOT NULL DEFAULT false,
  push_sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_publish_at_idx ON public.announcements (publish_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.announcements FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

-- Felhasználó: a megjelent (és a célközönségének szóló) közlemények; admin: minden
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT TO authenticated USING (
    public.is_admin()
    OR (
      publish_at IS NOT NULL AND publish_at <= now()
      AND (
        audience = 'all'
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.preferred_language = 'hu')
      )
    )
  );
DROP POLICY IF EXISTS "announcements_admin_write" ON public.announcements;
CREATE POLICY "announcements_admin_write" ON public.announcements
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 2. Közlemények olvasottsága ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.announcement_reads FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.announcement_reads TO authenticated;
DROP POLICY IF EXISTS "own_announcement_reads" ON public.announcement_reads;
CREATE POLICY "own_announcement_reads" ON public.announcement_reads
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── 3. Személyes értesítések ────────────────────────────────────────────────
-- A szöveget nem tároljuk: a kliens a fajta + adatok alapján a felhasználó
-- aktuális nyelvén jeleníti meg. dedup_key: egy esemény csak egyszer.
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::JSONB,
  dedup_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  UNIQUE (user_id, dedup_key)
);

CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx ON public.user_notifications (user_id, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_notifications FROM anon, authenticated;
GRANT SELECT ON public.user_notifications TO authenticated;
-- Csak az olvasottság állítható; létrehozni triggerek / a szerver tudja
GRANT UPDATE (read_at) ON public.user_notifications TO authenticated;
DROP POLICY IF EXISTS "own_user_notifications_select" ON public.user_notifications;
CREATE POLICY "own_user_notifications_select" ON public.user_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own_user_notifications_update" ON public.user_notifications;
CREATE POLICY "own_user_notifications_update" ON public.user_notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Belső segédfüggvény a triggereknek (kívülről nem hívható)
CREATE OR REPLACE FUNCTION public.add_user_notification(p_user_id UUID, p_kind TEXT, p_data JSONB, p_dedup_key TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.user_notifications (user_id, kind, data, dedup_key)
  VALUES (p_user_id, p_kind, coalesce(p_data, '{}'::JSONB), p_dedup_key)
  ON CONFLICT (user_id, dedup_key) DO NOTHING;
$$;
REVOKE EXECUTE ON FUNCTION public.add_user_notification(UUID, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;

-- 🏅 Új mérföldkő
CREATE OR REPLACE FUNCTION public.notify_badge_earned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.add_user_notification(NEW.user_id, 'badge', jsonb_build_object('badge_id', NEW.badge_id), 'badge:' || NEW.badge_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS user_badges_notify ON public.user_badges;
CREATE TRIGGER user_badges_notify AFTER INSERT ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.notify_badge_earned();

-- ★ Uralt gyakorlat
CREATE OR REPLACE FUNCTION public.notify_exercise_mastered()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'mastered' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'mastered') THEN
    PERFORM public.add_user_notification(
      NEW.user_id,
      'exercise_mastered',
      jsonb_build_object('fokozat', NEW.fokozat, 'section', NEW.section, 'exercise_key', NEW.exercise_key),
      'mastered:' || NEW.fokozat || ':' || NEW.section || ':' || NEW.exercise_key
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS magia_progress_notify_mastered ON public.magia_progress;
CREATE TRIGGER magia_progress_notify_mastered AFTER INSERT OR UPDATE OF status ON public.magia_progress
  FOR EACH ROW EXECUTE FUNCTION public.notify_exercise_mastered();

-- 🎟 Új meghívó (az admin adta)
CREATE OR REPLACE FUNCTION public.notify_invite_granted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.amount > 0 THEN
    PERFORM public.add_user_notification(NEW.user_id, 'invite_granted', jsonb_build_object('amount', NEW.amount), 'grant:' || NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS invite_grants_notify ON public.invite_grants;
CREATE TRIGGER invite_grants_notify AFTER INSERT ON public.invite_grants
  FOR EACH ROW EXECUTE FUNCTION public.notify_invite_granted();

-- 📊 Heti jelentés: a push-ütemező hívja vasárnap 19:00 után (csak service_role).
-- Csak azok kapják, akiknek volt gyakorlásuk az adott héten (mint a push).
DROP FUNCTION IF EXISTS public.create_weekly_report_notifications(DATE);
CREATE OR REPLACE FUNCTION public.create_weekly_report_notifications(p_week_start DATE, p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.user_notifications (user_id, kind, data, dedup_key)
  SELECT DISTINCT s.user_id, 'weekly_report', jsonb_build_object('week_start', p_week_start), 'weekly:' || p_week_start
  FROM public.magia_sessions s
  WHERE s.user_id IS NOT NULL AND s.started_at >= p_start AND s.started_at < p_end
  ON CONFLICT (user_id, dedup_key) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_weekly_report_notifications(DATE, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_weekly_report_notifications(DATE, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- ── 4. Lekérdező függvények (a hívó jogaival: az RLS érvényes) ───────────────
-- Közlemény olvasottnak számít, ha elolvasta, ha lejárt, vagy ha a regisztrációja
-- előtt jelent meg (egy új felhasználót ne fogadjon egy halom régi hír).
CREATE OR REPLACE FUNCTION public.notifications_feed(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  source TEXT,
  kind TEXT,
  title TEXT,
  body TEXT,
  translations JSONB,
  link_url TEXT,
  link_label TEXT,
  data JSONB,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_read BOOLEAN
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH me AS (
    SELECT coalesce((SELECT p.created_at FROM public.profiles p WHERE p.id = auth.uid()), '-infinity'::TIMESTAMPTZ) AS joined
  )
  SELECT * FROM (
    SELECT a.id, 'announcement'::TEXT, a.kind, a.title, a.body, a.translations, a.link_url, a.link_label, NULL::JSONB,
           a.publish_at, a.expires_at,
           (EXISTS (SELECT 1 FROM public.announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = auth.uid())
            OR (a.expires_at IS NOT NULL AND a.expires_at <= now())
            OR a.publish_at < (SELECT joined FROM me))
    FROM public.announcements a
    WHERE a.publish_at IS NOT NULL AND a.publish_at <= now()
    UNION ALL
    SELECT n.id, 'personal'::TEXT, n.kind, NULL::TEXT, NULL::TEXT, NULL::JSONB, NULL::TEXT, NULL::TEXT, n.data, n.created_at,
           NULL::TIMESTAMPTZ, n.read_at IS NOT NULL
    FROM public.user_notifications n
    WHERE n.user_id = auth.uid()
  ) f
  ORDER BY 10 DESC
  LIMIT least(greatest(coalesce(p_limit, 50), 1), 500);
$$;
REVOKE EXECUTE ON FUNCTION public.notifications_feed(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notifications_feed(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.notifications_unread_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT (
    SELECT count(*) FROM public.announcements a
    WHERE a.publish_at IS NOT NULL AND a.publish_at <= now()
      AND (a.expires_at IS NULL OR a.expires_at > now())
      AND a.publish_at >= coalesce((SELECT p.created_at FROM public.profiles p WHERE p.id = auth.uid()), '-infinity'::TIMESTAMPTZ)
      AND NOT EXISTS (SELECT 1 FROM public.announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = auth.uid())
  )::INTEGER + (
    SELECT count(*) FROM public.user_notifications n WHERE n.user_id = auth.uid() AND n.read_at IS NULL
  )::INTEGER;
$$;
REVOKE EXECUTE ON FUNCTION public.notifications_unread_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notifications_unread_count() TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE sql
SET search_path = ''
AS $$
  INSERT INTO public.announcement_reads (user_id, announcement_id)
  SELECT auth.uid(), a.id FROM public.announcements a
  WHERE a.publish_at IS NOT NULL AND a.publish_at <= now()
  ON CONFLICT DO NOTHING;
  UPDATE public.user_notifications SET read_at = now() WHERE user_id = auth.uid() AND read_at IS NULL;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- ── 5. Megőrzés: a személyes értesítések 2 év után törlődnek ────────────────
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'notifications-retention';
SELECT cron.schedule(
  'notifications-retention',
  '17 3 * * *',
  $$ DELETE FROM public.user_notifications WHERE created_at < now() - INTERVAL '2 years' $$
);
