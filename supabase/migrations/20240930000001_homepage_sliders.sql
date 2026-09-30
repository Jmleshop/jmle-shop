-- Homepage: Hero-Slides Basis, 3 Banner-Zonen, Marken-Logos, Kategorie-Sichtbarkeit
-- Idempotent — erstellt fehlende Basistabellen und erweitert sie.

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
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
  ADD COLUMN IF NOT EXISTS subtitle_de TEXT;

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
