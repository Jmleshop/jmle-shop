-- =============================================================================
-- Security fix (2026-10-25)
-- 1) Kunden können profiles.role nicht mehr selbst ändern (Admin-Eskalation).
-- 2) cart_items: Row Level Security einschalten (Policy existiert bereits).
-- 3) brand_logos, hero_slides, site_settings: Schreiben nur noch für Personal
--    (vorher durfte jeder angemeldete Kunde ändern/löschen). Lesen bleibt öffentlich.
-- Idempotent: mehrfach ausführbar.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Rolle nur durch Admins, service_role oder Dashboard/SQL-Editor änderbar
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER, damit current_user die anfragende Rolle ist.
-- Nur Anfragen über die öffentliche API (anon/authenticated) werden geprüft;
-- service_role, postgres (SQL-Editor) und SECURITY-DEFINER-Trigger wie
-- handle_new_user bleiben unberührt.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'customer';
  ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role darf nur von Admins geändert werden'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- 2) cart_items: RLS an. Die bestehende Policy
--    "Allow users to manage own cart items" (auth.uid() = user_id) greift dann.
--    Gäste nutzen localStorage, der Stripe-Webhook den service_role-Client.
-- ---------------------------------------------------------------------------
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cart_items FROM anon;

-- ---------------------------------------------------------------------------
-- 3) Marken-Logos, Banner, Website-Einstellungen: nur Personal schreibt.
--    Alle Schreibzugriffe im Code laufen über Admin-Routen mit requireStaff/
--    requireAdmin (Session eines admin/employee). Die öffentlichen
--    Lese-Policies ("Public read …", USING true) bleiben unverändert.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated manage brand logos" ON public.brand_logos;
DROP POLICY IF EXISTS "Staff manage brand logos" ON public.brand_logos;
CREATE POLICY "Staff manage brand logos"
  ON public.brand_logos FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Admin Full Access Hero Slides" ON public.hero_slides;
DROP POLICY IF EXISTS "Staff manage hero slides" ON public.hero_slides;
CREATE POLICY "Staff manage hero slides"
  ON public.hero_slides FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Authenticated manage site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Staff manage site settings" ON public.site_settings;
CREATE POLICY "Staff manage site settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

COMMIT;
