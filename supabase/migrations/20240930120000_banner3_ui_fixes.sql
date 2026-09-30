-- Banner-Media-Typen + products_public Sync (Kategorie-Produkte Bugfix)

ALTER TABLE public.hero_slides
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS interactive_style TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hero_slides_media_type_check'
  ) THEN
    ALTER TABLE public.hero_slides
      ADD CONSTRAINT hero_slides_media_type_check
      CHECK (media_type IN ('image', 'video', 'parallax', 'product_card'));
  END IF;
END $$;

-- products_public: fehlende Spalten (gross_weight etc.) — sonst schlägt Katalog-Select fehl
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

-- Site-Settings Defaults für Sektions-Titel / Zone-Namen mergen
UPDATE public.site_settings
SET value = value || jsonb_build_object(
  'brandsSectionTitle', COALESCE(value->>'brandsSectionTitle', ''),
  'banner2SectionTitle', COALESCE(value->>'banner2SectionTitle', ''),
  'banner3SectionTitle', COALESCE(value->>'banner3SectionTitle', ''),
  'zoneLabels', COALESCE(value->'zoneLabels', '{
    "banner1": "Hero Banner 1",
    "brands": "Marken-Logos",
    "banner2": "Banner 2",
    "banner3": "Banner 3"
  }'::jsonb)
)
WHERE key = 'site';
