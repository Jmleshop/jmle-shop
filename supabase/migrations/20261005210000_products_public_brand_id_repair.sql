-- Repair: products.brand_id + products_public.brand_id (idempotent)
-- Behebt DBs, bei denen banner3_ui_fixes die View ohne brand_id neu erstellt hat.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand_id TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'brand_logos'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_brand_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_brand_id_fkey
      FOREIGN KEY (brand_id) REFERENCES public.brand_logos(id) ON DELETE SET NULL;
  END IF;
END $$;

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
