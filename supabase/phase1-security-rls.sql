-- =============================================================================
-- jmle Phase 1 Security: Privilege Escalation Hardening + products_public
-- =============================================================================
-- Ausführen im Supabase SQL Editor (Produktion/Staging).
-- Idempotent: mehrfach ausführbar.
--
-- Ziele:
-- 1) Kunden können profiles.role NIEMALS selbst ändern (Trigger + Policies).
-- 2) Role-Änderungen nur via service_role oder Admin (is_admin()).
-- 3) products_public enthält KEINE Einkaufspreise / internen Margenfelder.
-- 4) Anon/Authenticated lesen Katalog nur über die View (nicht Base-Tabelle).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Hilfsfunktionen (falls noch nicht vorhanden)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'employee')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- 1) Trigger: Rolle nur durch service_role oder Admin änderbar
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT := coalesce(auth.jwt() ->> 'role', '');
BEGIN
  -- INSERT: Nicht-Admin / Nicht-Service erzwingen customer
  IF TG_OP = 'INSERT' THEN
    IF jwt_role = 'service_role' THEN
      RETURN NEW;
    END IF;
    -- Auch Admins dürfen beim Anlegen anderer Profile die Rolle setzen
    IF public.is_admin() THEN
      IF NEW.role IS NULL OR btrim(NEW.role) = '' THEN
        NEW.role := 'customer';
      END IF;
      RETURN NEW;
    END IF;
    NEW.role := 'customer';
    RETURN NEW;
  END IF;

  -- UPDATE: role-Änderung blockieren
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF jwt_role = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF public.is_admin() THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Privilege escalation denied: profiles.role cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- 2) RLS-Policies neu aufsetzen (ohne Role-Escalation im WITH CHECK)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile safe fields" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Staff can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_staff());

-- Insert: eigene Zeile, Rolle wird vom Trigger auf customer gezwungen
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Update: eigene Zeile — Trigger blockiert role-Änderung serverseitig
CREATE POLICY "Users update own profile safe fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins dürfen beliebige Profile inkl. Rolle aktualisieren (Trigger erlaubt is_admin)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3) Sichere Admin-RPC zum Setzen der Rolle (optional, ohne Client-Direktschreiben)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change roles' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('customer', 'employee', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  UPDATE public.profiles
  SET role = p_role, updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) products_public: keine Einkaufspreise / Margen / interne Nummern
-- security_invoker = false → View läuft mit Owner-Rechten und exponiert
-- nur sichere Spalten. Direkter SELECT auf products bleibt Staff-only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.products_public
WITH (security_invoker = false) AS
SELECT
  id,
  name_ar,
  name_de,
  description,
  price,
  currency,
  category_id,
  image,
  images,
  ingredients,
  allergens,
  origin_country,
  weight_value,
  weight_unit,
  gross_weight_value,
  gross_weight_unit,
  best_before_note,
  vat_rate,
  discount_percent,
  barcode,
  max_order_quantity,
  stock_quantity,
  deleted_at,
  created_at,
  updated_at
FROM public.products
WHERE deleted_at IS NULL
  AND COALESCE(status, 'published') = 'published';

COMMENT ON VIEW public.products_public IS
  'Öffentlicher Produktkatalog ohne purchase_price/product_number; security_definer.';

GRANT SELECT ON public.products_public TO anon, authenticated;

-- Base-Tabelle: kein öffentlicher Direktzugriff (verhindert purchase_price-Leak)
REVOKE ALL ON TABLE public.products FROM anon;
REVOKE ALL ON TABLE public.products FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;

DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
DROP POLICY IF EXISTS "Staff can select all products" ON public.products;

-- Nur Staff darf die Basistabelle lesen (inkl. purchase_price)
CREATE POLICY "Staff can select all products"
  ON public.products FOR SELECT
  USING (public.is_staff());

-- Staff CUD absichern (idempotent neu setzen)
DROP POLICY IF EXISTS "Staff can insert products" ON public.products;
DROP POLICY IF EXISTS "Staff can update products" ON public.products;
DROP POLICY IF EXISTS "Staff can delete products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

CREATE POLICY "Staff can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_staff());

CREATE POLICY "Staff can update products"
  ON public.products FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "Staff can delete products"
  ON public.products FOR DELETE
  USING (public.is_staff());

-- ---------------------------------------------------------------------------
-- 5) Unique Index für Stripe-Idempotenz (falls noch nicht vorhanden)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_session_id_uidx
  ON public.orders (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
