# Performance Audit

## Measured (Local Next.js on :3000 — Prior session 2026-10-15)

Safe GET timings (not production, not Lighthouse):

| Route | Cold TTFB | Warm TTFB | Response size | Evidence |
|---|---|---|---|---|
| `/` | **1.55s** | 0.19s | ~253 KB HTML | Local |
| `/products` | 0.78s | 0.12s | ~225 KB | Local |
| `/brands/ahmad` | 0.57s | 0.09s | ~151 KB | Local |
| `/api/search?q=a` | 0.91s | 0.03s | ~2 KB | Local |
| `/api/products` | 0.20s | — | ~9 KB (13 products in that DB) | Local |

**Not measured this pass:** production TTFB, LCP/CLS/INP, bundle analyzer output, DB EXPLAIN.

## Code-level bottlenecks

| Issue | Where | Why | Class |
|---|---|---|---|
| Homepage fan-out | `app/page.tsx` + `catalog-server.ts` | Many parallel cached queries; cold cache expensive | High |
| Full catalog caching | `getProductsCached` | Large payloads as catalog grows | High |
| Dashboard counts | `admin/.../dashboard/page.tsx` | Fetches **all** products to count | High |
| Inventory/products admin | admin pages | Full list into client state | Medium |
| Heavy editor deps | `@imgly/background-removal` | Large; mitigated by `outputFileTracingExcludes` | Medium |
| Client islands on home | marquees, locale, cart | Hydration cost | Medium |
| Image remote failures | next/image | Retries/errors hurt UX | Medium when hosts wrong |
| Cache TTL 60s | `REVALIDATE_SECONDS` | Stale vs load tradeoff | Informational |

## Positive controls (Code)

- `unstable_cache` + `revalidateTag` on catalog mutations  
- `next/image` AVIF/WebP + size caps  
- Client WebP compression before Storage  
- Search API short cache (`s-maxage=30`)  
- Offers carousel caps DOM items (`MARQUEE_MAX_ITEMS`)  

## Reliability

| Topic | Finding |
|---|---|
| Error UI | Root `error.tsx` / `global-error.tsx` / `not-found.tsx` |
| Monitoring | No Sentry/Datadog integration found |
| Logging | `console.error` in catalog/webhook paths |
| Fallback catalog | Exists if DB empty — can mask outages |

## Recommended measurement plan (future)

1. Production Web Vitals (Vercel Analytics or CrUX).  
2. `NEXT_DEBUG` / React Profiler on home.  
3. Bundle analyzer on Next build (read-only report).  
4. Supabase query insights for `products_public` scans.  
5. Compare TTFB with warm vs cold after `revalidateTag`.  

## Suggested optimizations (do not implement in audit)

1. Count endpoints for dashboard.  
2. Slim homepage selects (fields/limits).  
3. Ensure pagination everywhere catalogs grow.  
4. Defer loading image editor chunks (already dynamic in places).  
5. Prefetch only above-fold brand/banner assets.