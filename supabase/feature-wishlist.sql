-- Wishlist / Favoriten (idempotent)
-- In Supabase SQL Editor ausführen. Ändert KEINE Produktdaten.

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS wishlist_items_user_id_idx
  ON public.wishlist_items (user_id);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wishlist" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can insert own wishlist" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can delete own wishlist" ON public.wishlist_items;

CREATE POLICY "Users can view own wishlist"
  ON public.wishlist_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist"
  ON public.wishlist_items FOR DELETE
  USING (auth.uid() = user_id);
