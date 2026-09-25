-- Produkt-Highlights: feste Badges (JSONB-Array) + freie Notiz
-- Idempotent. Fügt Spalten hinzu und erweitert die öffentliche View.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badges JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS custom_note TEXT NOT NULL DEFAULT '';

-- products_public um die neuen Felder erweitern (security_invoker beibehalten)
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
  updated_at,
  badges,
  custom_note
FROM public.products
WHERE deleted_at IS NULL
  AND COALESCE(status, 'published') <> 'draft';

GRANT SELECT ON public.products_public TO anon, authenticated;
