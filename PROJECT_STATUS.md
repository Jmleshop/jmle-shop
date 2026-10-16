# jmle-shop — Project Status

**Last audit:** 2026-10-16 (documentation-only pass)  
**Detailed docs:** [`docs/README.md`](./docs/README.md)

## What it is

**jmle** is an Arabic-first (RTL) / German bilingual online grocery and specialty-food shop. Customers browse products, brands, and categories; add to cart/wishlist; pay via Stripe. Staff manage catalog, media, homepage layout, and (partially) commerce ops in `/admin`.

## How it is built

| Layer | Choice (verified) |
|---|---|
| App | Next.js **15.5.20** App Router + React **19.2.7** (Lockfile) |
| Language | TypeScript **5.9.3** |
| Styling | Tailwind CSS **3.4.19** + `globals.css` tokens |
| Data/Auth/Storage | Supabase (`@supabase/ssr` 0.5.2, `supabase-js` 2.115.0) |
| Payments | Stripe server SDK **17.7.0**; webhook signature + idempotency (Code) |
| Hosting | Vercel (`jmle-shop.vercel.app` hard-coded production host) (Code) |
| Images | Supabase Storage `product-images` + `next/image` AVIF/WebP |

## Main systems

1. **Storefront RSC** — `src/app/page.tsx` + `catalog-server.ts` (cached catalog).  
2. **Admin** — `/admin/*` gated by middleware + layout + `requireStaff`/`requireAdmin`.  
3. **Commerce** — Cart (guest localStorage / auth `cart_items`) → `/api/checkout` → Stripe → webhook → `orders`.  
4. **Media** — Client WebP compress → Storage → public URLs on products/slides/brands.  
5. **Homepage builder** — Sections + layout CSS vars in `site_settings` JSONB.

## Implementation status (high level)

| Area | Status |
|---|---|
| Catalog browse (products/categories/brands) | Implemented (Code) |
| Search | Implemented (header + `/search` + API) |
| Cart / Checkout / Stripe webhook | Implemented (Code); prod webhook config Unknown |
| Wishlist | Implemented guest + DB |
| Admin products/categories/slides/brands/builder/site/trash | Implemented |
| Admin orders/discounts/users | **Pages+APIs exist but missing from sidebar**; mostly read-only |
| Favicon | **Missing** (Code) |
| Footer shop logo | **Prop discarded** in `SiteFooter.tsx` (Code) |
| Storefront product filters (brand/price facets) | **Not found** on `/products` (Code) |
| Automated e2e / CI | **None** (no `.github`, no `npm test`) |

## Most important confirmed problems

1. Admin commerce pages not linked in `AdminSidebar.tsx`.  
2. Discounts: create/list only — no deactivate/delete API/UI.  
3. Users: no role-update API/UI; employee poorly represented.  
4. Orders: read-only; no status workflow UI.  
5. No favicon asset/configuration.  
6. Footer ignores `logoUrl`.  
7. Local home cold TTFB ~1.5s (Local, 2026-10-15 measurement).  
8. Dashboard fetches full product list for counts.  
9. Service-role DB client after staff auth bypasses RLS (Code — prod impact Unknown).  
10. Upload MIME checks mostly client-side.

## Critical unverified areas

- Production RLS policies actually applied  
- Production Stripe webhook endpoint + secrets  
- Deployed schema vs multiple repo SQL files  
- Real Core Web Vitals / Lighthouse on production  
- Visual QA of every admin/storefront page on devices  

## Recommended next steps

See [`docs/IMPROVEMENT_ROADMAP.md`](./docs/IMPROVEMENT_ROADMAP.md). Suggested first controlled PRs: sidebar links → discount lifecycle → user roles → favicon/footer logo → dashboard counts API → homepage query slim.

## Evidence sources

- Lockfile dependency versions  
- Source under `src/`, `supabase/`, `next.config.ts`  
- Safe unit tests: 17/17 passed for homepage-sections, locale-sort, layout-builder, shipping (`tsx --test`, 2026-10-16)  
- Prior local HTTP timings documented in `docs/PERFORMANCE_AUDIT.md`