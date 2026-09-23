-- Anonymes Page-View Tracking (DSGVO-freundlich, keine IPs/User-IDs)
-- In Supabase SQL Editor ausführen.

CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  device TEXT NOT NULL CHECK (device IN ('mobile', 'tablet', 'desktop')),
  language TEXT,
  region_hint TEXT,
  country_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS page_views_path_idx ON public.page_views (path);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
DROP POLICY IF EXISTS "Staff can read page views" ON public.page_views;

-- Öffentliches Insert ohne Auth (nur INSERT, kein SELECT)
CREATE POLICY "Anyone can insert page views"
  ON public.page_views FOR INSERT
  WITH CHECK (true);

-- Nur Staff liest Analytics
CREATE POLICY "Staff can read page views"
  ON public.page_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(coalesce(p.role, '')) IN ('admin', 'employee')
    )
  );

COMMENT ON TABLE public.page_views IS
  'Anonyme Seitenaufrufe für jmle Traffic-Analytics. Keine IP, keine User-ID.';
