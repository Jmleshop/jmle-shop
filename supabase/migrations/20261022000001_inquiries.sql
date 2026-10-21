CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'callback')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  first_name TEXT,
  last_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  street TEXT,
  postal_code TEXT,
  city TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  invoice_status TEXT NOT NULL DEFAULT 'draft' CHECK (invoice_status IN ('draft', 'issued')),
  invoice_number TEXT,
  invoice_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage inquiries" ON public.inquiries;
CREATE POLICY "Admins manage inquiries"
  ON public.inquiries FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
