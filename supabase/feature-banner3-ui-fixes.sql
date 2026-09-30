-- Manuell im Supabase SQL Editor ausführen (Production), falls Migrations nicht auto-laufen.
-- Entspricht: supabase/migrations/20240930000001_homepage_sliders.sql
--            + supabase/migrations/20240930120000_banner3_ui_fixes.sql

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site settings" ON public.site_settings;
CREATE POLICY "Public read site settings"
  ON public.site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff manage site settings" ON public.site_settings;
CREATE POLICY "Staff manage site settings"
  ON public.site_settings FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

INSERT INTO public.site_settings (key, value) VALUES
  (
    'site',
    '{
      "name": "jmle",
      "tagline": "أجود المنتجات العربية",
      "currency": "EUR",
      "locale": "ar",
      "categoriesSectionTitle": "تسوق على حسب الفئة",
      "brandsSectionTitle": "",
      "banner2SectionTitle": "",
      "banner3SectionTitle": "",
      "zoneLabels": {
        "banner1": "Hero Banner 1",
        "brands": "Marken-Logos",
        "banner2": "Banner 2",
        "banner3": "Banner 3"
      },
      "description": "متجر jmle للمواد الغذائية العربية الأصيلة — بهارات، أرز، زيوت والمزيد"
    }'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.hero_slides (
  id TEXT PRIMARY KEY,
  image TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active hero slides" ON public.hero_slides;
CREATE POLICY "Public read active hero slides"
  ON public.hero_slides FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Staff manage hero slides" ON public.hero_slides;
CREATE POLICY "Staff manage hero slides"
  ON public.hero_slides FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

ALTER TABLE public.hero_slides
  ADD COLUMN IF NOT EXISTS link_url TEXT,
  ADD COLUMN IF NOT EXISTS link_category_id TEXT,
  ADD COLUMN IF NOT EXISTS slider_zone TEXT NOT NULL DEFAULT 'banner1',
  ADD COLUMN IF NOT EXISTS title_ar TEXT,
  ADD COLUMN IF NOT EXISTS title_de TEXT,
  ADD COLUMN IF NOT EXISTS subtitle_ar TEXT,
  ADD COLUMN IF NOT EXISTS subtitle_de TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS interactive_style TEXT;

UPDATE public.hero_slides
SET
  title_ar = COALESCE(NULLIF(title_ar, ''), title),
  subtitle_ar = COALESCE(NULLIF(subtitle_ar, ''), subtitle)
WHERE title_ar IS NULL OR title_ar = '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hero_slides_slider_zone_check'
  ) THEN
    ALTER TABLE public.hero_slides DROP CONSTRAINT hero_slides_slider_zone_check;
  END IF;
  ALTER TABLE public.hero_slides
    ADD CONSTRAINT hero_slides_slider_zone_check
    CHECK (slider_zone IN ('banner1', 'banner2', 'banner3'));
END $$;

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

CREATE INDEX IF NOT EXISTS hero_slides_zone_sort_idx
  ON public.hero_slides (slider_zone, sort_order)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS public.brand_logos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL,
  link_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.brand_logos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active brand logos" ON public.brand_logos;
CREATE POLICY "Public read active brand logos"
  ON public.brand_logos FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Staff manage brand logos" ON public.brand_logos;
CREATE POLICY "Staff manage brand logos"
  ON public.brand_logos FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS show_on_homepage BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS categories_homepage_sort_idx
  ON public.categories (show_on_homepage, sort_order)
  WHERE deleted_at IS NULL;

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
