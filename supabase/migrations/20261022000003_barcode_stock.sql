ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER NOT NULL DEFAULT 5;

CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_unique
  ON public.products (barcode)
  WHERE barcode IS NOT NULL AND btrim(barcode) <> '' AND deleted_at IS NULL;
