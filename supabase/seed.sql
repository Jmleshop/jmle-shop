-- Seed data for local development: categories + products (storefront catalog)
-- Mirrors data/products.json so the storefront renders content out of the box.

INSERT INTO public.categories (id, name_ar, name_de, image, sort_order) VALUES
  ('spices',    'بهارات',   'Gewürze',      'https://images.unsplash.com/photo-1596040033229-a0b517a33173?w=400&q=80', 1),
  ('rice',      'أرز',      'Reis',         'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80', 2),
  ('oils',      'زيوت',     'Öle',          'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80', 3),
  ('dairy',     'ألبان',    'Milchprodukte','https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&q=80', 4),
  ('legumes',   'بقوليات',  'Hülsenfrüchte','https://images.unsplash.com/photo-1515543900108-63f1658a8c74?w=400&q=80', 5),
  ('sweets',    'حلويات',   'Süßigkeiten',  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80', 6),
  ('canned',    'معلبات',   'Konserven',    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80', 7),
  ('beverages', 'مشروبات',  'Getränke',     'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&q=80', 8)
ON CONFLICT (id) DO NOTHING;

-- price is the list price; discount_percent yields the displayed sale price.
INSERT INTO public.products
  (name_ar, name_de, description, price, currency, category_id, image, vat_rate, discount_percent, stock_quantity, max_order_quantity)
VALUES
  ('بهار سبعة أصناف',      'Sieben-Gewürze-Mischung', 'خلطة بهارات عربية أصيلة من سبعة أصناف مختارة بعناية.', 6.99, 'EUR', 'spices',    'https://images.unsplash.com/photo-1596040033229-a0b517a33173?w=600&q=80', 7,  29, 100, 10),
  ('كركم هندي فاخر',       'Kurkuma',                 'كركم طبيعي 100%، غني بالنكهة واللون الذهبي.',          4.99, 'EUR', 'spices',    'https://images.unsplash.com/photo-1615485290381-4418754e774e?w=600&q=80', 7,  30,  80, 10),
  ('أرز بسمتي ممتاز',      'Basmati Reis',            'أرز بسمتي طويل الحبة من أفضل مزارع الهند.',            11.99,'EUR', 'rice',      'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80', 7,  25,  60, 10),
  ('أرز مصري أبيض',        'Ägyptischer Reis',        'أرز مصري فاخر، مثالي للمحاشي والكشري.',                 7.49, 'EUR', 'rice',      'https://images.unsplash.com/photo-1536304997881-876e53ea1e0a?w=600&q=80', 7,  27,  50, 10),
  ('زيت زيتون بكر ممتاز',  'Natives Olivenöl',        'زيت زيتون بكر ممتاز، عصر على البارد.',                 15.99,'EUR', 'oils',      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80', 7,  19,  40, 10),
  ('زيت سمسم محمص',        'Sesamöl',                 'زيت سمسم طبيعي بنكهة غنية، مثالي للسلطات.',            9.99, 'EUR', 'oils',      'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&q=80', 7,  20,  35, 10),
  ('لبنة بلدية',           'Labneh',                  'لبنة كريمية طازجة بنكهة تقليدية أصيلة.',               5.49, 'EUR', 'dairy',     'https://images.unsplash.com/photo-1488477181941-6428a0291777?w=600&q=80', 7,  27,  45, 10),
  ('جبنة حلوم',            'Halloumi',                'جبنة حلوم طازجة، مثالية للشواء والفطور.',              7.99, 'EUR', 'dairy',     'https://images.unsplash.com/photo-1452195100-c6898c179281?w=600&q=80', 7,  25,  30, 10),
  ('عدس أحمر',             'Rote Linsen',             'عدس أحمر مجروش، سريع التحضير ولذيذ.',                  3.49, 'EUR', 'legumes',   'https://images.unsplash.com/photo-1515543900108-63f1658a8c74?w=600&q=80', 7,  29,  70, 10),
  ('حمص حب',               'Kichererbsen',            'حمص حب كبير الحجم، مثالي للطبخ والسلطات.',             4.29, 'EUR', 'legumes',   'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&q=80', 7,  23,  65, 10),
  ('بقلاوة فاخرة',         'Baklava',                 'بقلاوة محشية بالفستق الحلبي والعسل الطبيعي.',          18.99,'EUR', 'sweets',    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80', 7,  21,  25, 10),
  ('طحينة سمسم',           'Tahini',                  'طحينة سمسم ناعمة 100%، مثالية للحمص والسلطات.',        5.99, 'EUR', 'canned',    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80', 7,  25,  55, 10),
  ('عصير تمر هندي',        'Tamarindensaft',          'عصير تمر هندي طبيعي، منعش ولذيذ.',                     5.49, 'EUR', 'beverages', 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80', 7,  27,  40, 10);

-- Demo discount code
INSERT INTO public.discount_codes (code, type, value, active, usage_limit)
VALUES ('WELCOME10', 'percent', 10, true, 1000)
ON CONFLICT (code) DO NOTHING;

-- Demo admin login for local development: admin@jmle.test / password123
-- Creates a confirmed auth user + identity; handle_new_user() trigger makes the profile.
DO $$
DECLARE
  admin_id UUID := '00000000-0000-0000-0000-0000000ad301';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@jmle.test') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'admin@jmle.test', crypt('password123', gen_salt('bf')),
      NOW(), '{"provider":"email","providers":["email"]}',
      '{"first_name":"Amina","last_name":"Admin","street":"Hauptstr. 1"}',
      NOW(), NOW(),
      '', '', '', '', '', '', '', ''
    );

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      admin_id::text, admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@jmle.test', 'email_verified', true),
      'email', NOW(), NOW(), NOW()
    );
  END IF;

  UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@jmle.test';
END $$;
