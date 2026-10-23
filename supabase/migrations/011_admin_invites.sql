-- 011: Admin felület alapjai + meghívókódok kezelése
-- Futtatás: Supabase SQL Editor. Többször is lefuttatható.
--
-- Figyelem: a 002-es migráció alapértelmezett jogai minden ÚJ táblára SELECT-et
-- adnak az anon szerepnek és teljes írást az authenticated szerepnek, ezért
-- minden új táblán kifejezetten visszavonjuk őket, és csak a szükségeset adjuk meg.

-- ── 1. Adminok ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admins FROM anon, authenticated;
GRANT SELECT ON public.admins TO authenticated;
DROP POLICY IF EXISTS "admins_select_own" ON public.admins;
CREATE POLICY "admins_select_own" ON public.admins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

INSERT INTO public.admins (user_id)
SELECT id FROM auth.users WHERE lower(email) = 'albafalco@gmail.com'
ON CONFLICT DO NOTHING;

-- Admin ÉS kétlépcsős azonosítással (aal2) belépett munkamenet.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
     AND coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── 2. Meghívókódok ──────────────────────────────────────────────────────────
ALTER TABLE public.invite_codes
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Élesben a 002 óta kézzel már le volt zárva; itt a repóban is rögzítjük.
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invite_codes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invite_codes TO authenticated;
DROP POLICY IF EXISTS "invite_codes_admin" ON public.invite_codes;
CREATE POLICY "invite_codes_admin" ON public.invite_codes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS invite_codes_created_by_idx ON public.invite_codes (created_by);
CREATE INDEX IF NOT EXISTS invite_codes_used_by_idx ON public.invite_codes (used_by);

-- A kezdő kódok a publikus repóban olvashatók: a még fel nem használtak érvénytelenek.
UPDATE public.invite_codes
SET revoked_at = now()
WHERE code IN ('QUINTESSENCE2025', 'MAGIC-INIT-001')
  AND is_used = false
  AND revoked_at IS NULL;

-- ── 3. Meghívó-jogok naplója (a felhasználói meghívásokhoz, később) ──────────
-- Egyenleg = kapott jogok összege − az elküldött, még érvényes meghívások.
-- rule_key: automatikus szabálynál egyedi kulcs, így egy szabály csak egyszer ad.
CREATE TABLE IF NOT EXISTS public.invite_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  reason TEXT NOT NULL,
  rule_key TEXT,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, rule_key)
);

ALTER TABLE public.invite_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invite_grants FROM anon, authenticated;
GRANT SELECT, INSERT ON public.invite_grants TO authenticated;
DROP POLICY IF EXISTS "invite_grants_select" ON public.invite_grants;
CREATE POLICY "invite_grants_select" ON public.invite_grants
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "invite_grants_admin_insert" ON public.invite_grants;
CREATE POLICY "invite_grants_admin_insert" ON public.invite_grants
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- ── 4. Admin műveletnapló (csak hozzáfűzés) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  action TEXT NOT NULL,
  target TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
DROP POLICY IF EXISTS "admin_audit_log_select" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_select" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admin_audit_log_insert" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_insert" ON public.admin_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND admin_id = auth.uid());

-- ── 5. Az admin látja a profilok alapadatait (pl. ki használt fel egy kódot) ─
-- Napló, lelki tükör és egyéb tartalom NEM: azokra nincs admin szabály.
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());
