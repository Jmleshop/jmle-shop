-- Produktschutz bei Kategorie-Löschung: ON DELETE SET NULL (kein CASCADE).
-- In Supabase SQL Editor ausführen, falls Migrationen nicht automatisch laufen.

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'products'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) ILIKE '%category_id%categories%'
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT IF EXISTS %I', rec.conname);
  END LOOP;
END $$;

ALTER TABLE public.products
  ALTER COLUMN category_id DROP NOT NULL;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.categories(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
