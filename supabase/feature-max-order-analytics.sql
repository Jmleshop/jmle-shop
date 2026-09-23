-- Feature-Set: offene Max-Bestellmenge + Katalog-Hilfen
-- In Supabase SQL Editor ausführen (idempotent).

-- max_order_quantity: NULL = "Offen" → Limit = aktueller Lagerbestand
ALTER TABLE public.products
  ALTER COLUMN max_order_quantity DROP NOT NULL;

ALTER TABLE public.products
  ALTER COLUMN max_order_quantity SET DEFAULT NULL;

COMMENT ON COLUMN public.products.max_order_quantity IS
  'NULL/0 = offen (Limit = stock_quantity); sonst feste Max-Menge pro Bestellung';

-- Optional: 0-Werte auf NULL normalisieren (offen)
UPDATE public.products
SET max_order_quantity = NULL
WHERE max_order_quantity IS NOT NULL AND max_order_quantity <= 0;
