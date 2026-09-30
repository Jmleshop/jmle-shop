-- Produktschutz: Kategorie-Löschung darf Produkte NIEMALS mitlöschen.
-- FK muss ON DELETE SET NULL sein (nie CASCADE).
-- Idempotent.

DO $$
DECLARE
  rec record;
BEGIN
  -- Alle FKs von products.category_id → categories droppen (egal ob CASCADE/RESTRICT)
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

-- category_id muss nullable sein (SET NULL)
ALTER TABLE public.products
  ALTER COLUMN category_id DROP NOT NULL;

-- Strikt: SET NULL — Produkte bleiben erhalten, category_id wird geleert
ALTER TABLE public.products
  ADD CONSTRAINT products_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.categories(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
