-- 018: Vezetéknév + keresztnév, névváltoztatás admin-jóváhagyással, a Megszólítás megszűnik
-- Futtatás: Supabase SQL Editor. Többször is lefuttatható.
--
-- - profiles.first_name / last_name kötelező; a régi `name` automatikusan számolódik
--   belőlük (magyar felületen vezetéknév elöl, máshol keresztnév elöl)
-- - a felhasználó a nevét csak kérelemmel módosíthatja (name_change_requests);
--   az admin hagyja jóvá; jóváhagyás után 90 napig nem kérhet újat
-- - display_name (015, „Megszólítás”) törlődik: a köszönés a keresztnév

-- ── 1. Új oszlopok + a meglévő nevek szétbontása ────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS name_changed_at TIMESTAMPTZ;

-- Magyar: első szó = vezetéknév, a többi = keresztnév ("Fazekas Péter")
UPDATE public.profiles
SET last_name = split_part(btrim(name), ' ', 1),
    first_name = coalesce(nullif(btrim(substr(btrim(name), length(split_part(btrim(name), ' ', 1)) + 1)), ''), btrim(name))
WHERE first_name IS NULL AND preferred_language = 'hu';

-- Más nyelv: utolsó szó = vezetéknév, a többi = keresztnév ("Peter Smith")
UPDATE public.profiles
SET last_name = coalesce(nullif(substring(btrim(name) FROM '([^ ]+)$'), ''), btrim(name)),
    first_name = coalesce(nullif(btrim(regexp_replace(btrim(name), '\s*[^ ]+$', '')), ''), btrim(name))
WHERE first_name IS NULL;

ALTER TABLE public.profiles ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN last_name SET NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_first_name_length;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_first_name_length
  CHECK (char_length(btrim(first_name)) BETWEEN 2 AND 50);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_last_name_length;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_last_name_length
  CHECK (char_length(btrim(last_name)) BETWEEN 2 AND 50);

-- ── 2. A teljes név (`name`) mindig a két mezőből számolódik ────────────────
CREATE OR REPLACE FUNCTION public.profiles_compute_name()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- Régi kód, ami még csak `name`-et küld: szétbontjuk
  IF NEW.first_name IS NULL AND NEW.name IS NOT NULL THEN
    IF NEW.preferred_language = 'hu' THEN
      NEW.last_name := split_part(btrim(NEW.name), ' ', 1);
      NEW.first_name := coalesce(nullif(btrim(substr(btrim(NEW.name), length(NEW.last_name) + 1)), ''), btrim(NEW.name));
    ELSE
      NEW.last_name := coalesce(nullif(substring(btrim(NEW.name) FROM '([^ ]+)$'), ''), btrim(NEW.name));
      NEW.first_name := coalesce(nullif(btrim(regexp_replace(btrim(NEW.name), '\s*[^ ]+$', '')), ''), btrim(NEW.name));
    END IF;
  END IF;
  NEW.first_name := btrim(NEW.first_name);
  NEW.last_name := btrim(NEW.last_name);
  NEW.name := CASE WHEN NEW.preferred_language = 'hu'
                   THEN NEW.last_name || ' ' || NEW.first_name
                   ELSE NEW.first_name || ' ' || NEW.last_name END;
  RETURN NEW;
END;
$$;

-- ── 3. A nevet a felhasználó közvetlenül nem írhatja át ─────────────────────
-- Csak a lenti függvények (jóváhagyás, admin javítás), a service role és az SQL Editor.
CREATE OR REPLACE FUNCTION public.profiles_protect_name()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (NEW.first_name IS DISTINCT FROM OLD.first_name
      OR NEW.last_name IS DISTINCT FROM OLD.last_name
      OR NEW.name_changed_at IS DISTINCT FROM OLD.name_changed_at)
     AND coalesce(current_setting('quintessence.name_change', true), '') <> 'on'
     -- only requests of signed-in users (SQL editor, service role: no auth.uid())
     AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'name_change_requires_approval' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- A triggerek névsorrendben futnak: előbb a védelem, aztán a számolás
DROP TRIGGER IF EXISTS profiles_10_protect_name ON public.profiles;
CREATE TRIGGER profiles_10_protect_name BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_name();
DROP TRIGGER IF EXISTS profiles_20_compute_name ON public.profiles;
CREATE TRIGGER profiles_20_compute_name BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_compute_name();

-- ── 4. Névváltoztatási kérelmek ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.name_change_requests (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL CHECK (char_length(btrim(first_name)) BETWEEN 2 AND 50),
  last_name TEXT NOT NULL CHECK (char_length(btrim(last_name)) BETWEEN 2 AND 50),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.name_change_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.name_change_requests FROM anon, authenticated;
GRANT SELECT ON public.name_change_requests TO authenticated;
DROP POLICY IF EXISTS "name_change_requests_select" ON public.name_change_requests;
CREATE POLICY "name_change_requests_select" ON public.name_change_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Kérelem beküldése: 'ok' | 'invalid' | 'unchanged' | 'cooldown'
CREATE OR REPLACE FUNCTION public.request_name_change(p_first TEXT, p_last TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_first TEXT := btrim(regexp_replace(coalesce(p_first, ''), '\s+', ' ', 'g'));
  v_last TEXT := btrim(regexp_replace(coalesce(p_last, ''), '\s+', ' ', 'g'));
  v_profile public.profiles%ROWTYPE;
  v_admin UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF char_length(v_first) NOT BETWEEN 2 AND 50 OR char_length(v_last) NOT BETWEEN 2 AND 50 THEN RETURN 'invalid'; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF v_profile.first_name = v_first AND v_profile.last_name = v_last THEN RETURN 'unchanged'; END IF;
  IF v_profile.name_changed_at IS NOT NULL AND v_profile.name_changed_at > now() - INTERVAL '90 days' THEN RETURN 'cooldown'; END IF;

  INSERT INTO public.name_change_requests (user_id, first_name, last_name, requested_at)
  VALUES (auth.uid(), v_first, v_last, now())
  ON CONFLICT (user_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, requested_at = now();

  FOR v_admin IN SELECT user_id FROM public.admins LOOP
    PERFORM public.add_user_notification(
      v_admin, 'name_change_requested',
      jsonb_build_object('username', v_profile.username, 'first_name', v_first, 'last_name', v_last),
      'namereq:' || auth.uid() || ':' || extract(epoch FROM now())::BIGINT
    );
  END LOOP;
  RETURN 'ok';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.request_name_change(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_name_change(TEXT, TEXT) TO authenticated;

-- Saját függő kérelem visszavonása
CREATE OR REPLACE FUNCTION public.cancel_name_change()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  DELETE FROM public.name_change_requests WHERE user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.cancel_name_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_name_change() TO authenticated;

-- Admin döntése: jóváhagyáskor a név átíródik, és indul a 90 nap
CREATE OR REPLACE FUNCTION public.admin_decide_name_change(p_user_id UUID, p_approve BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_req public.name_change_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_req FROM public.name_change_requests WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_request' USING ERRCODE = 'P0002'; END IF;

  IF p_approve THEN
    PERFORM set_config('quintessence.name_change', 'on', true);
    UPDATE public.profiles
    SET first_name = v_req.first_name, last_name = v_req.last_name, name_changed_at = now(), updated_at = now()
    WHERE id = p_user_id;
  END IF;
  DELETE FROM public.name_change_requests WHERE user_id = p_user_id;

  PERFORM public.add_user_notification(
    p_user_id,
    CASE WHEN p_approve THEN 'name_change_approved' ELSE 'name_change_rejected' END,
    jsonb_build_object('first_name', v_req.first_name, 'last_name', v_req.last_name),
    'namedecision:' || p_user_id || ':' || extract(epoch FROM now())::BIGINT
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_decide_name_change(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_name_change(UUID, BOOLEAN) TO authenticated;

-- Admin közvetlen javítása (pl. rossz szétbontás): nem indítja a 90 napot
CREATE OR REPLACE FUNCTION public.admin_set_name(p_user_id UUID, p_first TEXT, p_last TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_first TEXT := btrim(regexp_replace(coalesce(p_first, ''), '\s+', ' ', 'g'));
  v_last TEXT := btrim(regexp_replace(coalesce(p_last, ''), '\s+', ' ', 'g'));
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF char_length(v_first) NOT BETWEEN 2 AND 50 OR char_length(v_last) NOT BETWEEN 2 AND 50 THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE = '22023';
  END IF;
  PERFORM set_config('quintessence.name_change', 'on', true);
  UPDATE public.profiles SET first_name = v_first, last_name = v_last, updated_at = now() WHERE id = p_user_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_set_name(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_name(UUID, TEXT, TEXT) TO authenticated;

-- ── 5. A „Megszólítás” megszűnik ────────────────────────────────────────────
ALTER TABLE public.profiles DROP COLUMN IF EXISTS display_name;

-- ── 6. Admin felhasználólista: név részei + függő kérelem ───────────────────
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
