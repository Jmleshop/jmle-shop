-- Flexible Homepage-Sektionen: slider_zone darf beliebige Zone-IDs haben

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hero_slides_slider_zone_check'
  ) THEN
    ALTER TABLE public.hero_slides DROP CONSTRAINT hero_slides_slider_zone_check;
  END IF;
END $$;

-- Optional: Index bleibt nutzbar für beliebige Zones
CREATE INDEX IF NOT EXISTS hero_slides_zone_sort_idx
  ON public.hero_slides (slider_zone, sort_order)
  WHERE active = true;
