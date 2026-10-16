-- 012: Admin felület – felhasználók és push-állapot (csak olvasó függvények)
-- Futtatás: Supabase SQL Editor. Többször is lefuttatható.
-- Minden függvény először az is_admin()-t ellenőrzi (admin + kétlépcsős belépés).

-- ── 1. Meghívó-egyenleg ─────────────────────────────────────────────────────
-- Kapott jogok összege − a felhasználó által létrehozott, még érvényes
-- (fel nem használt, nem lejárt, nem visszavont) vagy már felhasznált kódok.
-- A saját egyenlegét bárki lekérdezheti (a felhasználói meghívásokhoz kell majd).
CREATE OR REPLACE FUNCTION public.invite_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN coalesce((SELECT sum(amount) FROM public.invite_grants WHERE user_id = p_user_id), 0)
       - (SELECT count(*) FROM public.invite_codes c
          WHERE c.created_by = p_user_id
            AND c.revoked_at IS NULL
            AND (c.is_used OR c.expires_at IS NULL OR c.expires_at > now()));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invite_balance(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_balance(UUID) TO authenticated;

-- ── 2. Felhasználólista ─────────────────────────────────────────────────────
-- Csak alapadatok és dátumok: napló, lelki tükör és gyakorlástartalom nincs benne.
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
  is_admin BOOLEAN
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
    nullif(greatest(
      coalesce((SELECT max((s.started_at AT TIME ZONE 'Europe/Budapest')::DATE)
                FROM public.magia_sessions s WHERE s.user_id = u.id), '-infinity'::DATE),
      CASE WHEN p.last_angol_activity_date ~ '^\d{4}-\d{2}-\d{2}$'
           THEN p.last_angol_activity_date::DATE ELSE '-infinity'::DATE END
    ), '-infinity'::DATE),
    coalesce(p.push_enabled, false),
    (SELECT count(*)::INTEGER FROM public.push_subscriptions ps WHERE ps.user_id = u.id),
    public.invite_balance(u.id),
    EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = u.id)
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- ── 3. Push-ütemező futásai ─────────────────────────────────────────────────
-- cron.job_run_details: a 'push-reminders' job futásai (sikerült-e elindítani);
-- net._http_response: a /api/push/send válaszai (a Supabase kb. 6 óráig őrzi).
CREATE OR REPLACE FUNCTION public.admin_push_runs(p_limit INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit INTEGER := least(greatest(coalesce(p_limit, 30), 1), 200);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'runs', coalesce((
      SELECT jsonb_agg(r ORDER BY r.start_time DESC)
      FROM (
        SELECT d.start_time, d.end_time, d.status, left(d.return_message, 300) AS return_message
        FROM cron.job_run_details d
        JOIN cron.job j ON j.jobid = d.jobid
        WHERE j.jobname = 'push-reminders'
        ORDER BY d.start_time DESC
        LIMIT v_limit
      ) r
    ), '[]'::JSONB),
    'responses', coalesce((
      SELECT jsonb_agg(x ORDER BY x.created DESC)
      FROM (
        SELECT h.created, h.status_code, h.timed_out, left(h.error_msg, 300) AS error_msg, left(h.content, 500) AS content
        FROM net._http_response h
        ORDER BY h.created DESC
        LIMIT v_limit
      ) x
    ), '[]'::JSONB)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_push_runs(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_push_runs(INTEGER) TO authenticated;
