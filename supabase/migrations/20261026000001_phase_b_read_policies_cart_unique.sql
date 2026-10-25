-- =============================================================================
-- Phase B (2026-10-26): Lesezugriffe absichern + Warenkorb-Eindeutigkeit
--  BS-1  products: Basistabelle nicht mehr öffentlich (Einkaufspreise,
--        Papierkorb). Der Shop liest weiter über die View products_public
--        (läuft mit Owner-Rechten, ohne purchase_price). Personal (admin,
--        employee) liest die Basistabelle für den Adminbereich.
--  BS-2  categories: Archivierte Kategorien nicht mehr öffentlich; aktive
--        bleiben über "Public can view active categories" lesbar.
--  BS-7  cart_items: UNIQUE(user_id, product_id), damit das Zusammenführen
--        des Gast-Warenkorbs (upsert onConflict user_id,product_id) klappt.
-- Löscht oder ändert keine Daten. Idempotent.
-- =============================================================================

BEGIN;

-- BS-1 ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Produkte lesbar" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Staff read products" ON public.products;
CREATE POLICY "Staff read products"
  ON public.products FOR SELECT TO authenticated
  USING (public.is_staff());

-- BS-2 ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Kategorien lesbar" ON public.categories;
DROP POLICY IF EXISTS "Staff read categories" ON public.categories;
CREATE POLICY "Staff read categories"
  ON public.categories FOR SELECT TO authenticated
  USING (public.is_staff());

-- BS-7 ---------------------------------------------------------------------
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_product_key;
ALTER TABLE public.cart_items
  ADD CONSTRAINT cart_items_user_product_key UNIQUE (user_id, product_id);

COMMIT;

-- Rückweg (nur bei Bedarf, stellt den vorherigen Zustand wieder her):
-- BEGIN;
-- DROP POLICY IF EXISTS "Staff read products" ON public.products;
-- CREATE POLICY "Produkte lesbar" ON public.products FOR SELECT USING (true);
-- CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (deleted_at IS NULL);
-- DROP POLICY IF EXISTS "Staff read categories" ON public.categories;
-- CREATE POLICY "Kategorien lesbar" ON public.categories FOR SELECT USING (true);
-- ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_product_key;
-- COMMIT;
