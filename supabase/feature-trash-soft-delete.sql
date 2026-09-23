-- Soft-Delete / Papierkorb (idempotent)
-- Ändert KEINE bestehenden Produktdaten — nur Spalten/Indizes falls fehlend.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products (deleted_at);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON public.categories (deleted_at);

COMMENT ON COLUMN public.products.deleted_at IS
  'NULL = aktiv; gesetzt = im Papierkorb (Soft Delete). Endgültiges Löschen nur per Admin-DELETE.';
COMMENT ON COLUMN public.categories.deleted_at IS
  'NULL = aktiv; gesetzt = im Papierkorb (Soft Delete). Endgültiges Löschen nur per Admin-DELETE.';
