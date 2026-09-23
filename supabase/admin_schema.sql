-- jmle Admin Schema Extension
-- Führen Sie dieses SQL NACH schema.sql im Supabase SQL Editor aus

-- Admin role on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer'
  CHECK (role IN ('customer', 'admin'));

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Shop products (managed by admin)
CREATE TABLE IF NOT EXISTS shop_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  original_price DECIMAL(10,2) CHECK (original_price IS NULL OR original_price >= 0),
  category_id TEXT NOT NULL,
  image TEXT NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON shop_products FOR SELECT
  USING (active = true OR is_admin());

CREATE POLICY "Admins can insert products"
  ON shop_products FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON shop_products FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete products"
  ON shop_products FOR DELETE
  USING (is_admin());

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_session_id TEXT UNIQUE,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can manage orders"
  ON orders FOR ALL
  USING (is_admin());

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND (o.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "Admins can manage order items"
  ON order_items FOR ALL
  USING (is_admin());

-- Discount codes
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value DECIMAL(10,2) NOT NULL CHECK (value > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active discount codes"
  ON discount_codes FOR SELECT
  USING (active = true OR is_admin());

CREATE POLICY "Admins can manage discount codes"
  ON discount_codes FOR ALL
  USING (is_admin());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Triggers
CREATE TRIGGER shop_products_updated_at
  BEFORE UPDATE ON shop_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed products from catalog (run once)
INSERT INTO shop_products (id, name, description, price, original_price, category_id, image, featured, stock)
VALUES
  ('prod-001', 'بهار سبعة أصناف', 'خلطة بهارات عربية أصيلة من سبعة أصناف مختارة بعناية.', 4.99, 6.99, 'spices', 'https://images.unsplash.com/photo-1596040033229-a0b517a33173?w=600&q=80', true, 100),
  ('prod-002', 'كركم هندي فاخر', 'كركم طبيعي 100%، غني بالنكهة واللون الذهبي.', 3.49, 4.99, 'spices', 'https://images.unsplash.com/photo-1615485290381-4418754e774e?w=600&q=80', true, 80),
  ('prod-003', 'أرز بسمتي ممتاز', 'أرز بسمتي طويل الحبة من أفضل مزارع الهند.', 8.99, 11.99, 'rice', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80', true, 60),
  ('prod-004', 'أرز مصري أبيض', 'أرز مصري فاخر، مثالي للمحاشي والكشري.', 5.49, 7.49, 'rice', 'https://images.unsplash.com/photo-1536304997881-876e53ea1e0a?w=600&q=80', false, 50),
  ('prod-005', 'زيت زيتون بكر ممتاز', 'زيت زيتون بكر ممتاز من olives فلسطينية، عصر على البارد.', 12.99, 15.99, 'oils', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80', true, 40),
  ('prod-006', 'زيت سمسم محمص', 'زيت سمسم طبيعي بنكهة غنية، مثالي للسلطات.', 7.99, 9.99, 'oils', 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&q=80', false, 35),
  ('prod-007', 'لبنة بلدية', 'لبنة كريمية طازجة بنكهة تقليدية أصيلة.', 3.99, 5.49, 'dairy', 'https://images.unsplash.com/photo-1488477181941-6428a0291777?w=600&q=80', true, 45),
  ('prod-008', 'جبنة حلوم', 'جبنة حلوم طازجة، مثالية للشواء والفطور.', 5.99, 7.99, 'dairy', 'https://images.unsplash.com/photo-1452195100-c6898c179281?w=600&q=80', false, 30),
  ('prod-009', 'عدس أحمر', 'عدس أحمر مجروش، سريع التحضير ولذيذ.', 2.49, 3.49, 'legumes', 'https://images.unsplash.com/photo-1515543900108-63f1658a8c74?w=600&q=80', false, 70),
  ('prod-010', 'حمص حب', 'حمص حب كبير الحجم، مثالي للطبخ والسلطات.', 3.29, 4.29, 'legumes', 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&q=80', true, 65),
  ('prod-011', 'بقلاوة فاخرة', 'بقلاوة محشية بالفستق الحلبي والعسل الطبيعي.', 14.99, 18.99, 'sweets', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80', true, 25),
  ('prod-012', 'طحينة سمسم', 'طحينة سمسم ناعمة 100%، مثالية للحمص والسلطات.', 4.49, 5.99, 'canned', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80', false, 55),
  ('prod-013', 'عصير تمر هندي', 'عصير تمر هندي طبيعي، منعش ولذيذ.', 3.99, 5.49, 'beverages', 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80', false, 40)
ON CONFLICT (id) DO NOTHING;

-- Admin-Benutzer einrichten (E-Mail anpassen!):
-- UPDATE profiles SET role = 'admin' WHERE email = 'ihre-admin@email.de';
