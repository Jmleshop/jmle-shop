-- Manuell in Supabase SQL Editor ausführbar (idempotent)
-- Zuerst fehlende Spalten anlegen (ältere DBs haben oft noch kein badges/custom_note)

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS badges JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS custom_note TEXT NOT NULL DEFAULT '';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gross_weight_value NUMERIC;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gross_weight_unit TEXT NOT NULL DEFAULT 'g';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand_id TEXT REFERENCES public.brand_logos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_brand_id_idx
  ON public.products (brand_id)
  WHERE deleted_at IS NULL AND brand_id IS NOT NULL;

DROP VIEW IF EXISTS public.products_public;
CREATE VIEW public.products_public AS
SELECT
  id,
  name_ar,
  name_de,
  description,
  price,
  currency,
  category_id,
  brand_id,
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
  badges,
  custom_note,
  status,
  deleted_at,
  created_at,
  updated_at
FROM public.products
WHERE deleted_at IS NULL
  AND (status IS NULL OR status = 'published');

GRANT SELECT ON public.products_public TO anon, authenticated;
