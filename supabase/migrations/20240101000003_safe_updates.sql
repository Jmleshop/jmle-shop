-- Additive only. Kein DROP TABLE, keine Löschung von Produkten/Kategorien.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

UPDATE public.products
SET status = 'published'
WHERE status IS NULL OR btrim(status) = '';

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_vat_rate_check;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_vat_rate_range;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_status_check
  CHECK (status IN ('published', 'draft'));

ALTER TABLE public.products ADD CONSTRAINT products_vat_rate_range
  CHECK (vat_rate >= 0 AND vat_rate <= 100);

CREATE OR REPLACE VIEW public.products_public
WITH (security_invoker = true) AS
SELECT
  id,
  name_ar,
  name_de,
  description,
  price,
  currency,
  category_id,
  image,
  images,
  ingredients,
  allergens,
  origin_country,
  weight_value,
  weight_unit,
  best_before_note,
  vat_rate,
  discount_percent,
  barcode,
  max_order_quantity,
  stock_quantity,
  deleted_at,
  created_at,
  updated_at
FROM public.products
WHERE deleted_at IS NULL
  AND COALESCE(status, 'published') <> 'draft';

GRANT SELECT ON public.products_public TO anon, authenticated;

-- Audit-Log: Mitarbeiter-E-Mail speichern (additiv, kein DROP TABLE)
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS user_email TEXT;

UPDATE public.audit_log a
SET user_email = p.email
FROM public.profiles p
WHERE a.user_email IS NULL
  AND a.user_id = p.id
  AND p.email IS NOT NULL
  AND btrim(p.email) <> '';

CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  actor_email TEXT;
BEGIN
  actor_email := COALESCE(
    NULLIF(auth.jwt() ->> 'email', ''),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, user_email, table_name, record_id, action, old_data, new_data)
    VALUES (auth.uid(), actor_email, TG_TABLE_NAME, NEW.id, 'INSERT', NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (user_id, user_email, table_name, record_id, action, old_data, new_data)
    VALUES (auth.uid(), actor_email, TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, user_email, table_name, record_id, action, old_data, new_data)
    VALUES (auth.uid(), actor_email, TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
