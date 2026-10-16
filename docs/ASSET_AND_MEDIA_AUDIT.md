# Assets & Media Audit

## Storage & pipeline (Code)

| Step | Implementation |
|---|---|
| Upload UI | `src/components/admin/ImageUpload.tsx` (`accept="image/*"`) |
| Client filter | `file.type.startsWith("image/")` |
| Compress | `src/lib/compress-image.ts` → WebP |
| Bounds | `src/lib/image-bounds.ts`: product 800px, banner 1280, logo 1600; ~0.55 MB target |
| Centering | `center-image-square.ts` for product-like folders |
| Storage | Bucket **`product-images`**, path `{folder}/{uuid}.webp` |
| Public URL | `getPublicUrl` stored on rows |
| Shop render | `next/image` + `originalImageSrc` (`sharp-image.ts`) |
| Editor | `ImageEditorModal`, crop, freisteller (`@imgly` / HF API) |
| Server optimize | `/api/admin/optimize-product-image`, `frame-product-image`, `reprocess-all-images` |

## Display rules (Code)

| Surface | Container | Fit | Notes |
|---|---|---|---|
| Product cards | `.product-image-frame` 1:1 | `contain` | Padding clamp |
| Banners | `.layout-banner-frame` aspect vars | default `cover` via builder | Viewport aspects desktop/tablet/mobile |
| Brand ticker logos | `.layout-brands-logo` fixed box | `contain` | Marquee |
| Categories | cover in circles/cards | `cover` | — |
| Shop logo | `BrandMark` | contain natural ratio | Header |
| Footer logo | intended BrandMark | **broken** — `SiteFooter` voids `logoUrl` | Code |

## Static assets in repo

| Path | Role |
|---|---|
| `public/placeholder.svg` | Placeholder |
| `public/fonts/Cairo-*.ttf` | PDF labels |
| Favicon / `app/icon.*` | **Not found** |
| `data/` | Historical; not live catalog |

## next/image configuration (Code)

- Formats: AVIF, WebP  
- `remotePatterns`: Unsplash, Supabase host from env, local `:54321`  
- **Risk:** URLs on other hosts fail at runtime (Inferred/Prior Local breakage with placehold.co)

## Issues

| Issue | Severity | Evidence | Status |
|---|---|---|---|
| No favicon | Medium | No `icon` file | Confirmed Code |
| Footer logo discarded | Medium | `SiteFooter.tsx` | Confirmed Code |
| Client-only MIME gate | Medium | ImageUpload | Confirmed Code |
| No server magic-byte validation found | Medium | Search | Confirmed Code gap |
| Oversized originals mitigated by WebP pipeline | Low (positive) | compress-image | Code |
| Broken remote images if host not allowlisted | High when occurs | next.config | Code + Prior Local |
| HeroSlider legacy unused | Low | no imports | Dead code |
| Signed URL leakage in docs | — | Avoided here | Policy |

## Logo / brand marks

- **Shop brand:** `site.logo` via `/api/admin/site` + `site-logo.ts`  
- **Partner brands:** `brand_logos` table; ticker links to `/brands/[id]` (internal; ignores external `linkUrl` in ticker) — Code  

## Verification still needed

- Actual Storage RLS/public bucket policies in production — Unknown  
- Average WebP byte sizes in prod — Unknown  
- CLS from banner aspect changes — Unverified  
- Freisteller quality on diverse SKUs — Unverified