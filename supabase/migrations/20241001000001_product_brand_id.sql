-- Produkt ↔ Marke (brand_logos)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand_id TEXT REFERENCES public.brand_logos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_brand_id_idx
  ON public.products (brand_id)
  WHERE deleted_at IS NULL AND brand_id IS NOT NULL;

-- products_public um brand_id erweitern
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
