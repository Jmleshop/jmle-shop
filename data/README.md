# data/

**Phase 3:** Der Live-Katalog kommt nicht mehr aus JSON.

| Inhalt | Quelle |
|--------|--------|
| Produkte / Kategorien | Supabase (`products_public`, `categories`) |
| Hero-Slider | Supabase Tabelle `hero_slides` |
| Site-Meta | Supabase `site_settings` (Key `site`) |

SQL-Migration: `supabase/phase3-catalog-search.sql`

Fallbacks im Code: `src/lib/site-defaults.ts` (nur wenn Tabellen noch leer sind).
