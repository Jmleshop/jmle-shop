-- jmle Schema v3 — Preise, Lager, Hierarchie, products_public, Stock-RPC
-- Idempotent. Im Supabase SQL Editor AUSFÜHREN.

-- ---------------------------------------------------------------------------
-- products: neue Spalten
-- ---------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vat_rate NUMERIC NOT NULL DEFAULT 19;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purchase_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_number TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gross_weight_value NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gross_weight_unit TEXT NOT NULL DEFAULT 'g';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_order_quantity INTEGER NOT NULL DEFAULT 10;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;

UPDATE public.products
SET stock_quantity = COALESCE(stock, 0)
WHERE stock_quantity = 0 AND stock IS NOT NULL AND stock > 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_vat_rate_check;
    ALTER TABLE public.products ADD CONSTRAINT products_vat_rate_check
      CHECK (vat_rate IN (7, 19));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- categories: parent_id, max. 3 Ebenen
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.category_depth(p_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  d INTEGER := 1;
  current_id TEXT := p_id;
  parent TEXT;
BEGIN
  IF current_id IS NULL THEN
    RETURN 0;
  END IF;
  LOOP
    SELECT parent_id INTO parent FROM public.categories WHERE id = current_id;
    EXIT WHEN parent IS NULL;
    d := d + 1;
    IF d > 10 THEN
      RETURN d;
    END IF;
    current_id := parent;
  END LOOP;
  RETURN d;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.enforce_category_depth()
RETURNS TRIGGER AS $$
DECLARE
  depth INTEGER;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Kategorie kann nicht sich selbst untergeordnet sein';
  END IF;
  depth := public.category_depth(NEW.parent_id) + 1;
  IF depth > 3 THEN
    RAISE EXCEPTION 'Maximal 3 Kategorie-Ebenen erlaubt';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS categories_depth_check ON public.categories;
CREATE TRIGGER categories_depth_check
  BEFORE INSERT OR UPDATE OF parent_id ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_category_depth();

-- ---------------------------------------------------------------------------
-- Öffentliche View ohne interne Felder
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.products_public
WITH (security_invoker = true) AS
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
WHERE deleted_at IS NULL;

GRANT SELECT ON public.products_public TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Atomarer Lagerabzug
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_items JSONB)
RETURNS VOID AS $$
DECLARE
  item JSONB;
  pid UUID;
  qty INTEGER;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    pid := (item->>'product_id')::uuid;
    qty := GREATEST(COALESCE((item->>'quantity')::int, 0), 0);
    UPDATE public.products
    SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - qty, 0)
    WHERE id = pid;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.decrement_product_stock(JSONB) TO authenticated, service_role;
