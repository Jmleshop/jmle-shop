# Database Architecture

**Important:** This describes **repository SQL and application queries**, not a verified production schema dump. Deployed state: **Unknown**.

## Sources of truth in repo (competing)

| Source | Role |
|---|---|
| `supabase/migrations/*.sql` | Ordered migrations (preferred for evolution) |
| `supabase/schema.sql`, `supabase-schema-v2.sql`, `v3` | Legacy/alternate |
| `supabase/fix-and-consolidate.sql` | Consolidation |
| `supabase/feature-*.sql` | Feature packs (wishlist, page views, brands, …) |
| `supabase/phase1-security-rls.sql` | RLS policies |
| `supabase/phase3-catalog-search.sql` | Public catalog/search |

**Risk:** Multiple overlapping definitions → drift (Code).

## Core entities (from SQL + types)

| Entity | Table/View | Key fields / relations |
|---|---|---|
| Profile | `profiles` | `id` ↔ auth.users; `role` customer\|employee\|admin |
| Category | `categories` | `parent_id` hierarchy; `sort_order`; soft delete |
| Product | `products` | `category_id`, `brand_id`, pricing, stock, `status`, images[], soft delete |
| Public products | `products_public` | View filtering published / not deleted |
| Brand | `brand_logos` | `id`, `name`, `image`, `link_url`, `sort_order`, `active` |
| Slides | `hero_slides` | zone, media, links, sort |
| Site settings | `site_settings` | key/value JSONB (`site`, layout_*, builder_*) |
| Cart | `cart_items` | `user_id` + `product_id` |
| Wishlist | `wishlist_items` | `user_id` + `product_id` |
| Orders | `orders` | stripe_session_id, totals, status, user_id |
| Order lines | `order_items` | order_id, product snapshot fields |
| Discounts | `discount_codes` | code, type, value, usage_*, active |
| Page views | `page_views` | analytics |
| Audit | `audit_log` | admin activity |
| Legacy | `shop_products` | Appears in older commerce SQL — verify if still used |

App types: `src/types/index.ts` (`Product`, `FoodProduct`, `BrandLogo`, `Order`, …).

## Important relationships

```
profiles 1──* orders
products *──1 categories (category_id)
products *──0..1 brand_logos (brand_id)
orders 1──* order_items
discount_codes referenced by orders.discount_code (soft)
site_settings JSON configures homepageSections / layout
```

## Access patterns (application)

| Path | Client | Notes |
|---|---|---|
| Storefront catalog | Anon/public client | `products_public`, cached in `catalog-server.ts` |
| Search | RPC `search_products_public` or ILIKE fallback | Code |
| Admin CRUD | Often **service role** after requireStaff | Bypasses RLS |
| Stripe webhook | Service role | System inserts |
| Customer cart/wishlist/orders | User session | RLS expected in feature SQL |

## Constraints / indexes (examples from migrations)

- `products.brand_id` FK + partial index (migration `20241001000001_product_brand_id.sql`) — Code  
- Soft delete via `deleted_at` — Code  
- Atomic discount usage feature SQL — Code  

## Data integrity issues observed in app logic

1. Brand assignment may be repaired at read time (text match → update `brand_id`) — side effect on GET path (Code).  
2. Missing `name_ar` allowed historically; admin validation now requires it on create (Zod) — Code.  
3. Homepage section duplicates possible in stored JSON until normalize/dedupe — Code.  

## Storage

- Bucket name used in code: **`product-images`**  
- Objects: WebP under folder prefixes `products/`, banners, brands/logos  

## What to verify in staging/prod (not done here)

```sql
-- examples only; do not run blindly in prod without approval
select tablename from pg_tables where schemaname='public';
select * from pg_policies where schemaname='public' limit 50;
```

Document results outside this repo if sensitive.