-- 014: Felhasználói meghívások (linkként), meghívó-előnézet a regisztrációhoz,
--      értesítés elfogadáskor és visszajáráskor.
-- Futtatás: Supabase SQL Editor. Többször is lefuttatható.

-- ── 1. Személyes üzenet a meghívóhoz ────────────────────────────────────────
ALTER TABLE public.invite_codes
  ADD COLUMN IF NOT EXISTS message TEXT CHECK (char_length(message) <= 200);

-- ── 2. Saját meghívó-állapot: egyenleg + havi keret ─────────────────────────
-- Havi keret: naptári hónap (Budapest); a visszavont meghívók nem számítanak bele.
CREATE OR REPLACE FUNCTION public.my_invite_status()
RETURNS TABLE (balance INTEGER, month_used INTEGER, month_limit INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_uid UUID := auth.uid();
  v_month_start TIMESTAMPTZ := date_trunc('month', now() AT TIME ZONE 'Europe/Budapest') AT TIME ZONE 'Europe/Budapest';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    public.invite_balance(v_uid),
    (SELECT count(*)::INTEGER FROM public.invite_codes c
     WHERE c.created_by = v_uid AND c.created_at >= v_month_start AND c.revoked_at IS NULL),
    3;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.my_invite_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_invite_status() TO authenticated;

-- ── 3. Meghívó létrehozása (minden feltétel egy tranzakcióban) ──────────────
-- A kódot a szerver generálja (kriptografikusan véletlen), itt csak ellenőrizzük.
-- Hibák (üzenet = kulcs): invalid_email, invalid_code, no_balance, monthly_limit,
-- email_registered, email_pending.
CREATE OR REPLACE FUNCTION public.create_user_invite(p_code TEXT, p_email TEXT, p_message TEXT)
RETURNS TABLE (id UUID, code TEXT, email TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := lower(trim(coalesce(p_email, '')));
  v_message TEXT := nullif(trim(left(coalesce(p_message, ''), 200)), '');
  v_month_start TIMESTAMPTZ := date_trunc('month', now() AT TIME ZONE 'Europe/Budapest') AT TIME ZONE 'Europe/Budapest';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF v_email !~ '^[^\s@,;<>()"'']+@[^\s@,;<>()"'']+\.[^\s@,;<>()"'']+$' OR length(v_email) > 254 THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF p_code !~ '^QX-[A-Z0-9]{4}-[A-Z0-9]{4}$' THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  -- Egyszerre csak egy meghívó készülhet felhasználónként (dupla kattintás)
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::TEXT, 0));

  IF public.invite_balance(v_uid) < 1 THEN
    RAISE EXCEPTION 'no_balance';
  END IF;
  IF (SELECT count(*) FROM public.invite_codes c
      WHERE c.created_by = v_uid AND c.created_at >= v_month_start AND c.revoked_at IS NULL) >= 3 THEN
    RAISE EXCEPTION 'monthly_limit';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = v_email) THEN
    RAISE EXCEPTION 'email_registered';
  END IF;
  IF EXISTS (SELECT 1 FROM public.invite_codes c
             WHERE c.email = v_email AND NOT c.is_used AND c.revoked_at IS NULL
               AND (c.expires_at IS NULL OR c.expires_at > now())) THEN
    RAISE EXCEPTION 'email_pending';
  END IF;

  RETURN QUERY
  INSERT INTO public.invite_codes (code, email, message, expires_at, created_by)
  VALUES (p_code, v_email, v_message, now() + INTERVAL '14 days', v_uid)
  RETURNING invite_codes.id, invite_codes.code, invite_codes.email, invite_codes.expires_at;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_user_invite(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_user_invite(TEXT, TEXT, TEXT) TO authenticated;

-- ── 4. Saját meghívó visszavonása ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revoke_user_invite(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.invite_codes
  SET revoked_at = now()
  WHERE id = p_id AND created_by = auth.uid() AND NOT is_used AND revoked_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revoke_user_invite(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_user_invite(UUID) TO authenticated;

-- ── 5. Saját meghívások listája ─────────────────────────────────────────────
-- A kód csak a még érvényes meghívóknál jön vissza (újra megosztáshoz).
CREATE OR REPLACE FUNCTION public.my_invites()
RETURNS TABLE (
  id UUID,
  code TEXT,
  email TEXT,
  message TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  is_used BOOLEAN,
  used_at TIMESTAMPTZ,
  used_username TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.id,
         CASE WHEN NOT c.is_used AND c.revoked_at IS NULL AND (c.expires_at IS NULL OR c.expires_at > now()) THEN c.code END,
         c.email, c.message, c.created_at, c.expires_at, c.revoked_at, c.is_used, c.used_at, p.username
  FROM public.invite_codes c
  LEFT JOIN public.profiles p ON p.id = c.used_by
  WHERE c.created_by = auth.uid()
  ORDER BY c.created_at DESC
  LIMIT 100;
$$;
REVOKE EXECUTE ON FUNCTION public.my_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_invites() TO authenticated;

-- ── 6. Meghívó-előnézet a regisztrációs oldalnak (bejelentkezés nélkül) ─────
-- Csak érvényes kódra válaszol; az e-mail-címet részben elrejtve adja vissza.
CREATE OR REPLACE FUNCTION public.invite_preview(p_code TEXT)
RETURNS TABLE (inviter_name TEXT, message TEXT, email_hint TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.name,
         c.message,
         CASE WHEN c.email IS NOT NULL
              THEN left(c.email, 1) || '***@' || split_part(c.email, '@', 2) END
  FROM public.invite_codes c
  LEFT JOIN public.profiles p ON p.id = c.created_by
  WHERE c.code IN (trim(p_code), upper(trim(p_code)))
    AND NOT c.is_used AND c.revoked_at IS NULL
    AND (c.expires_at IS NULL OR c.expires_at > now())
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.invite_preview(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_preview(TEXT) TO anon, authenticated;

-- ── 7. Értesítések ──────────────────────────────────────────────────────────
-- 🎉 Elfogadták a meghívót (a regisztráció a profil létrehozása után állítja be a used_by-t)
CREATE OR REPLACE FUNCTION public.notify_invite_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.created_by IS NOT NULL AND NEW.used_by IS NOT NULL AND OLD.used_by IS NULL THEN
    PERFORM public.add_user_notification(
      NEW.created_by,
      'invite_accepted',
      jsonb_build_object('username', (SELECT username FROM public.profiles WHERE id = NEW.used_by)),
      'invite_accepted:' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS invite_codes_notify_accepted ON public.invite_codes;
CREATE TRIGGER invite_codes_notify_accepted AFTER UPDATE OF used_by ON public.invite_codes
  FOR EACH ROW EXECUTE FUNCTION public.notify_invite_accepted();

-- 🎟 Visszajárt a meghívó, mert az admin visszavonta (a saját visszavonásról nem szólunk).
-- Az adminok kódjai nem fogynak az egyenlegből, róluk nincs értesítés.
CREATE OR REPLACE FUNCTION public.notify_invite_revoked()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.created_by IS NOT NULL AND OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL
     AND NOT NEW.is_used
     AND NEW.created_by IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = NEW.created_by) THEN
    PERFORM public.add_user_notification(
      NEW.created_by,
      'invite_returned',
      jsonb_build_object('email', NEW.email, 'reason', 'revoked'),
      'invite_returned:' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS invite_codes_notify_revoked ON public.invite_codes;
CREATE TRIGGER invite_codes_notify_revoked AFTER UPDATE OF revoked_at ON public.invite_codes
  FOR EACH ROW EXECUTE FUNCTION public.notify_invite_revoked();

-- 🎟 Visszajárt a meghívó, mert lejárt (óránkénti ütemezett ellenőrzés)
CREATE OR REPLACE FUNCTION public.notify_expired_invites()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.user_notifications (user_id, kind, data, dedup_key)
  SELECT c.created_by, 'invite_returned', jsonb_build_object('email', c.email, 'reason', 'expired'), 'invite_returned:' || c.id
  FROM public.invite_codes c
  WHERE c.created_by IS NOT NULL
    AND NOT c.is_used AND c.revoked_at IS NULL
    AND c.expires_at <= now() AND c.expires_at > now() - INTERVAL '7 days'
    AND NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = c.created_by)
  ON CONFLICT (user_id, dedup_key) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_expired_invites() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'invites-expired-notify';
SELECT cron.schedule('invites-expired-notify', '7 * * * *', $$ SELECT public.notify_expired_invites() $$);

-- ── 8. Admin felhasználólista: ki hívta meg, hány meghívót küldött ──────────
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
  invites_accepted INTEGER
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
    (SELECT count(*)::INTEGER FROM public.invite_codes ic WHERE ic.created_by = u.id AND ic.is_used)
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
