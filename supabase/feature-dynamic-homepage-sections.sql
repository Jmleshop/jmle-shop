-- Manuell im Supabase SQL Editor ausführen
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hero_slides_slider_zone_check'
  ) THEN
    ALTER TABLE public.hero_slides DROP CONSTRAINT hero_slides_slider_zone_check;
  END IF;
END $$;
