-- Warenkorb nur für den eigenen Nutzer. Idempotent, falls die Tabelle schon existiert.
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
