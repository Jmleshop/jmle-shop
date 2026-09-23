-- jmle Schema v2 — Kategorien, Lebensmittel-Produkte, Staff-Rollen, Storage
-- Im Supabase SQL Editor AUSFÜHREN (nach schema.sql / admin_schema.sql).

-- ---------------------------------------------------------------------------
-- Profile-Rollen: customer | admin | employee
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'admin', 'employee'));

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'employee')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- Kategorien (Soft-Delete über deleted_at)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_de TEXT NOT NULL,
  slug TEXT UNIQUE,
  image TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active categories" ON categories;
CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT
  USING (deleted_at IS NULL OR is_staff());

DROP POLICY IF EXISTS "Staff can insert categories" ON categories;
CREATE POLICY "Staff can insert categories"
  ON categories FOR INSERT
  WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Staff can update categories" ON categories;
CREATE POLICY "Staff can update categories"
  ON categories FOR UPDATE
  USING (is_staff());

DROP POLICY IF EXISTS "Staff can delete categories" ON categories;
CREATE POLICY "Staff can delete categories"
  ON categories FOR DELETE
  USING (is_staff());

-- ---------------------------------------------------------------------------
-- Produkte (Lebensmittel-Felder, Soft-Delete über deleted_at)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_de TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ingredients TEXT NOT NULL DEFAULT '',
  allergens TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL DEFAULT '',
  weight TEXT NOT NULL DEFAULT '',
  halal_status TEXT NOT NULL DEFAULT 'unbekannt'
    CHECK (halal_status IN ('halal', 'nicht_halal', 'unbekannt')),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (deleted_at IS NULL OR is_staff());

DROP POLICY IF EXISTS "Staff can insert products" ON products;
CREATE POLICY "Staff can insert products"
  ON products FOR INSERT
  WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Staff can update products" ON products;
CREATE POLICY "Staff can update products"
  ON products FOR UPDATE
  USING (is_staff());

DROP POLICY IF EXISTS "Staff can delete products" ON products;
CREATE POLICY "Staff can delete products"
  ON products FOR DELETE
  USING (is_staff());

-- updated_at
DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);

-- Staff dürfen alle Profile lesen (für Audit-Anzeige)
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
CREATE POLICY "Staff can view all profiles"
  ON profiles FOR SELECT
  USING (is_staff());

-- ---------------------------------------------------------------------------
-- Storage: Produktbilder
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Staff can upload product images" ON storage.objects;
CREATE POLICY "Staff can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND is_staff());

DROP POLICY IF EXISTS "Staff can update product images" ON storage.objects;
CREATE POLICY "Staff can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND is_staff());

DROP POLICY IF EXISTS "Staff can delete product images" ON storage.objects;
CREATE POLICY "Staff can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND is_staff());
