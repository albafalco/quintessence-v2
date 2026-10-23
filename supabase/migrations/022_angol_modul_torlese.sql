-- 022: A Kreatív Angol modul megszűnik
-- Futtatás: Supabase SQL Editor, MIUTÁN az új kód kiment (Vercel kész). Többször is lefuttatható.
--
-- FIGYELEM: a felhasználók Angol-haladása véglegesen törlődik.
--
-- - az Angol táblák és függvények törlődnek
-- - a zárt modulok rendszere (module_access) megszűnik: csak az Angolhoz kellett
-- - a profil Angol-oszlopai törlődnek (emlékeztető, időpont, napi aktivitás)
-- - az admin felhasználólista Angol nélkül
-- - a megmaradt nyomok törlődnek: Angol mérföldkövek és csengő-értesítéseik,
--   „modul feloldva” értesítések, a hozzáférések admin naplója, a régi kezdő
--   meghívókód, a közlemények Angolra mutató linkjei

BEGIN;

-- ── 1. Admin felhasználólista: Angol nélkül ─────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_list_users();
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  name TEXT,
  username TEXT,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  banned_until TIMESTAMPTZ,
  last_practice_date DATE,
  push_enabled BOOLEAN,
  push_devices INTEGER,
  invite_balance INTEGER,
  is_admin BOOLEAN,
  invited_by_username TEXT,
  invites_sent INTEGER,
  invites_accepted INTEGER,
  first_name TEXT,
  last_name TEXT,
  name_changed_at TIMESTAMPTZ,
  pending_first_name TEXT,
  pending_last_name TEXT,
  pending_requested_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    p.name,
    p.username,
    u.email::TEXT,
    u.created_at,
    u.last_sign_in_at,
    u.banned_until,
    (SELECT max((s.started_at AT TIME ZONE 'Europe/Budapest')::DATE)
     FROM public.magia_sessions s WHERE s.user_id = u.id),
    coalesce(p.push_enabled, false),
    (SELECT count(*)::INTEGER FROM public.push_subscriptions ps WHERE ps.user_id = u.id),
    public.invite_balance(u.id),
    EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = u.id),
    (SELECT ip.username FROM public.invite_codes ic JOIN public.profiles ip ON ip.id = ic.created_by
     WHERE ic.used_by = u.id LIMIT 1),
    (SELECT count(*)::INTEGER FROM public.invite_codes ic WHERE ic.created_by = u.id AND ic.revoked_at IS NULL),
    (SELECT count(*)::INTEGER FROM public.invite_codes ic WHERE ic.created_by = u.id AND ic.is_used),
    p.first_name,
    p.last_name,
    p.name_changed_at,
    r.first_name,
    r.last_name,
    r.requested_at
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.name_change_requests r ON r.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- ── 2. Zárt modulok ─────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.module_access CASCADE;
DROP FUNCTION IF EXISTS public.notify_module_granted();
DROP FUNCTION IF EXISTS public.has_module_access(TEXT);

-- ── 3. Angol táblák és függvények ───────────────────────────────────────────
DO $$
DECLARE
  f REGPROCEDURE;
BEGIN
  FOR f IN
    SELECT p.oid::REGPROCEDURE
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE '%angol%'
  LOOP
    EXECUTE format('DROP FUNCTION %s CASCADE', f);
  END LOOP;
END $$;

DROP TABLE IF EXISTS
  public.angol_card_progress,
  public.angol_section_unlocks,
  public.angol_exam_results,
  public.angol_hard_items
CASCADE;

-- ── 4. Profil-oszlopok ──────────────────────────────────────────────────────
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS push_angol_reminders,
  DROP COLUMN IF EXISTS push_angol_time,
  DROP COLUMN IF EXISTS last_angol_push_date,
  DROP COLUMN IF EXISTS last_angol_activity_date;

-- ── 5. Megmaradt nyomok ─────────────────────────────────────────────────────
DELETE FROM public.user_badges WHERE badge_id IN ('words_50', 'words_all', 'first_exam', 'all_sections');
DELETE FROM public.user_notifications
WHERE kind = 'module_granted'
   OR (kind = 'badge' AND data->>'badge_id' IN ('words_50', 'words_all', 'first_exam', 'all_sections'));
DELETE FROM public.admin_audit_log WHERE action IN ('module.grant', 'module.revoke');
DELETE FROM public.invite_codes WHERE code = 'ANGOL-START-001';
UPDATE public.announcements
SET link_url = NULL, link_label = NULL
WHERE link_url LIKE '%/modules/angol%';

COMMIT;
