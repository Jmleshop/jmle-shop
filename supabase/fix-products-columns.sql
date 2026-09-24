-- Fix: bringt die Tabelle public.products auf den von der App erwarteten Stand.
-- Idempotent — im Supabase SQL Editor VOR dem Produkt-Import ausführen.
-- Behebt u. a.: ERROR 42703: column "in_stock" of relation "products" does not exist.

-- Grundtabelle sicherstellen (falls sie noch gar nicht existiert)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Alle Spalten, die der Import verwendet (fehlende werden ergänzt, vorhandene bleiben unberührt)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name_ar        TEXT NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name_de        TEXT NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description    TEXT NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price          NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS currency       TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id    TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image          TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images         JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight_value   NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight_unit    TEXT NOT NULL DEFAULT 'g';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS in_stock       BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'published';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vat_rate       NUMERIC NOT NULL DEFAULT 19;

-- Weitere Spalten, die die öffentliche Ansicht (products_public) und der Shop erwarten
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_percent   NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_order_quantity INTEGER NOT NULL DEFAULT 10;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode            TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ingredients        TEXT NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allergens          TEXT NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS origin_country     TEXT NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS best_before_note   TEXT NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at         TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at         TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();
