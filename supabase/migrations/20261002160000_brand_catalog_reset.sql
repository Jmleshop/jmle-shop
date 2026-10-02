-- Marken-Katalog Reset (Dokumentation / lokale Supabase).
-- Produktiv-Reset inkl. Produkt-Matching: node --import tsx scripts/reset-brands.ts
-- oder POST /api/admin/brands/reset (Admin).
--
-- Diese Migration leert brand_logos und setzt brand_id zurück.
-- Der vollständige Import der ~70 arabischen Marken erfolgt über brand-catalog.ts.

UPDATE public.products SET brand_id = NULL WHERE brand_id IS NOT NULL;
DELETE FROM public.brand_logos;
