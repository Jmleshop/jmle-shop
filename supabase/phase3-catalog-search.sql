-- =============================================================================
-- jmle Phase 3: Hero-Slides, Site-Settings, Search (pg_trgm)
-- Idempotent — im Supabase SQL Editor ausführen.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Site-Settings (Key/Value JSON)
-- ---------------------------------------------------------------------------
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
      "description": "متجر jmle للمواد الغذائية العربية الأصيلة — بهارات، أرز، زيوت والمزيد"
    }'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Hero-Slides
-- ---------------------------------------------------------------------------
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

INSERT INTO public.hero_slides (id, image, title, subtitle, sort_order, active) VALUES
  (
    'slide-1',
    'https://images.unsplash.com/photo-1596040033229-a0b517a33173?w=1600&q=80',
    'بهارات وتوابل أصيلة',
    'نكهات من المطبخ العربي مباشرة إلى منزلك',
    1,
    true
  ),
  (
    'slide-2',
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1600&q=80',
    'أرز فاخر بأنواعه',
    'بسمتي، مصري، وأسمر — جودة ممتازة',
    2,
    true
  ),
  (
    'slide-3',
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1600&q=80',
    'زيوت طبيعية نقية',
    'زيت زيتون، سمسم، ودوار الشمس',
    3,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Trigram-Indizes für schnelle arabische / gemischte Suche
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS products_name_ar_trgm_idx
  ON public.products USING gin (name_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_name_de_trgm_idx
  ON public.products USING gin (name_de gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_description_trgm_idx
  ON public.products USING gin (description gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Search-RPC: ILIKE auf products_public (arabisch/latein tolerant)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_products_public(
  p_query TEXT,
  p_limit INT DEFAULT 24
)
RETURNS SETOF public.products_public
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.products_public p
  WHERE
    p_query IS NULL
    OR btrim(p_query) = ''
    OR p.name_ar ILIKE '%' || btrim(p_query) || '%'
    OR COALESCE(p.name_de, '') ILIKE '%' || btrim(p_query) || '%'
    OR COALESCE(p.description, '') ILIKE '%' || btrim(p_query) || '%'
    OR COALESCE(p.ingredients, '') ILIKE '%' || btrim(p_query) || '%'
    OR COALESCE(p.origin_country, '') ILIKE '%' || btrim(p_query) || '%'
  ORDER BY
    CASE
      WHEN p.name_ar ILIKE btrim(p_query) || '%' THEN 0
      WHEN p.name_ar ILIKE '%' || btrim(p_query) || '%' THEN 1
      ELSE 2
    END,
    p.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 24), 100));
$$;

GRANT EXECUTE ON FUNCTION public.search_products_public(TEXT, INT) TO anon, authenticated;
