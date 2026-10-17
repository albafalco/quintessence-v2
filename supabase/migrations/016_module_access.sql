-- 016: Zárt modulok — a Kreatív Angolt csak az admin által kijelölt felhasználók látják
-- Futtatás: Supabase SQL Editor. Többször is lefuttatható.
--
-- - module_access: ki melyik zárt modulhoz fér hozzá (általános, más modulhoz is jó)
-- - has_module_access(): hozzáférés VAGY admin (az admin mindig látja)
-- - az angol táblákba írni csak hozzáféréssel lehet; olvasni a saját adatot
--   továbbra is lehet (adatmentés), de a felület elrejti
-- - hozzáférés adásakor személyes értesítés megy a csengőbe

-- ── 1. Hozzáférések ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.module_access (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('angol')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module)
);

ALTER TABLE public.module_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.module_access FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.module_access TO authenticated;

DROP POLICY IF EXISTS "module_access_select" ON public.module_access;
CREATE POLICY "module_access_select" ON public.module_access
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "module_access_admin_insert" ON public.module_access;
CREATE POLICY "module_access_admin_insert" ON public.module_access
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "module_access_admin_delete" ON public.module_access;
CREATE POLICY "module_access_admin_delete" ON public.module_access
  FOR DELETE TO authenticated USING (public.is_admin());

-- Hozzáférés a megadott modulhoz; az admin (2FA nélkül is) mindig hozzáfér.
CREATE OR REPLACE FUNCTION public.has_module_access(p_module TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.module_access WHERE user_id = auth.uid() AND module = p_module)
      OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.has_module_access(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_module_access(TEXT) TO authenticated;

-- ── 2. Angol táblák: írás csak hozzáféréssel ────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['angol_card_progress', 'angol_section_unlocks', 'angol_exam_results', 'angol_hard_items'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'own_' || t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'own_' || t || '_write', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', 'own_' || t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id AND public.has_module_access(''angol'')) WITH CHECK (auth.uid() = user_id AND public.has_module_access(''angol''))',
      'own_' || t || '_write', t
    );
  END LOOP;
END $$;

-- A régi, mindent engedő szabályok helyett a fenti kettő él
DROP POLICY IF EXISTS "own_angol_card" ON public.angol_card_progress;
DROP POLICY IF EXISTS "own_angol_unlocks" ON public.angol_section_unlocks;
DROP POLICY IF EXISTS "own_angol_exam" ON public.angol_exam_results;
DROP POLICY IF EXISTS "own_angol_hard_items" ON public.angol_hard_items;

-- ── 3. Értesítés hozzáférés adásakor ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_module_granted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.add_user_notification(
    NEW.user_id,
    'module_granted',
    jsonb_build_object('module', NEW.module),
    'module:' || NEW.module || ':' || extract(epoch FROM NEW.granted_at)::BIGINT
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS module_access_notify ON public.module_access;
CREATE TRIGGER module_access_notify AFTER INSERT ON public.module_access
  FOR EACH ROW EXECUTE FUNCTION public.notify_module_granted();

-- ── 4. Admin felhasználólista: hozzáférés + van-e már angol haladása ────────
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
  angol_access BOOLEAN,
  angol_has_progress BOOLEAN
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
    EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = u.id),
    (SELECT ip.username FROM public.invite_codes ic JOIN public.profiles ip ON ip.id = ic.created_by
     WHERE ic.used_by = u.id LIMIT 1),
    (SELECT count(*)::INTEGER FROM public.invite_codes ic WHERE ic.created_by = u.id AND ic.revoked_at IS NULL),
    (SELECT count(*)::INTEGER FROM public.invite_codes ic WHERE ic.created_by = u.id AND ic.is_used),
    EXISTS (SELECT 1 FROM public.module_access m WHERE m.user_id = u.id AND m.module = 'angol'),
    -- the registration stores the starting unlocks (0, 1, 2, 5) for everyone
    EXISTS (SELECT 1 FROM public.angol_card_progress c WHERE c.user_id = u.id)
      OR EXISTS (SELECT 1 FROM public.angol_exam_results e WHERE e.user_id = u.id)
      OR EXISTS (SELECT 1 FROM public.angol_section_unlocks su WHERE su.user_id = u.id AND su.section_id NOT IN (0, 1, 2, 5))
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
