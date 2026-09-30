-- Manuell im Supabase SQL Editor ausführen, falls Migrations nicht auto-laufen.
-- Siehe auch: supabase/migrations/20240930000001_homepage_sliders.sql
--             supabase/migrations/20240930120000_banner3_ui_fixes.sql
-- Empfohlen: supabase/feature-banner3-ui-fixes.sql ausführen.

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
