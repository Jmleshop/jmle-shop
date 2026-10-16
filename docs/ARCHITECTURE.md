# Architecture

Evidence: **Code** unless marked otherwise. Diagrams reflect inspected modules.

## 1. High-level system

```mermaid
flowchart LR
  Browser[Browser Storefront / Admin]
  Next[Next.js 15 App Router]
  SB[(Supabase Postgres + Auth + Storage)]
  Stripe[Stripe Checkout + Webhooks]
  Opt[Optional DeepL / MyMemory / HF]

  Browser --> Next
  Next --> SB
  Next --> Stripe
  Stripe -->|webhook| Next
  Next -.-> Opt
```

## 2. Request flow (storefront catalog)

```mermaid
sequenceDiagram
  participant B as Browser
  participant P as RSC page.tsx
  participant C as catalog-server.ts
  participant Cache as unstable_cache
  participant SB as Supabase

  B->>P: GET /
  P->>C: getHomepageSectionsAsync / getBrandLogosAsync / ...
  C->>Cache: tagged cache ~60s
  Cache->>SB: products_public / brand_logos / hero_slides / site_settings
  SB-->>P: rows
  P-->>B: HTML + client islands
```

## 3. AuthZ flow (admin)

```mermaid
flowchart TD
  Req[Request /admin or /api/admin]
  MW[middleware updateSession]
  Login{/admin/login?}
  User{Supabase getUser}
  Role{profiles.role staff?}
  AdminOnly{admin-only prefix?}
  OK[Allow]
  Deny[401/403 or redirect /auth/login]

  Req --> MW --> Login
  Login -->|yes public| OK
  Login -->|no| User
  User -->|no user| Deny
  User -->|user| Role
  Role -->|not admin/employee| Deny
  Role -->|employee + admin-only| Deny
  Role -->|ok| OK
```

Additional checks: `admin/(dashboard)/layout.tsx`, `requireStaff` / `requireAdmin` in route handlers (`src/lib/admin-server.ts`).

## 4. Brand / product lookup

```mermaid
flowchart TD
  Ticker[BrandLogoTicker Link /brands/id]
  Page[brands/id/page.tsx]
  G1[getBrandByIdAsync]
  G2[getProductsByBrandAsync]
  Cache[Product cache filter brandId]
  DB[Query products_public.brand_id]
  Text[Text match name + optional persist brand_id]

  Ticker --> Page --> G1 --> G2
  G2 --> Cache -->|hit| Done[ProductGrid]
  Cache -->|miss| DB -->|hit| Done
  DB -->|miss| Text --> Done
```

Files: `BrandLogoTicker.tsx`, `catalog-server.ts` (`getProductsByBrandAsync`).

## 5. Image upload & processing

```mermaid
flowchart LR
  UI[ImageUpload / ImageEditorModal]
  Comp[compress-image.ts WebP + bounds]
  Stor[Supabase Storage product-images]
  DB[(products / hero_slides / brand_logos URL fields)]
  Shop[next/image storefront]

  UI --> Comp --> Stor --> DB --> Shop
  UI -.->|optional| OptAPI[optimize / remove-background / frame APIs]
```

## 6. Stripe checkout & webhook

```mermaid
sequenceDiagram
  participant C as Checkout page
  participant API as /api/checkout
  participant S as Stripe
  participant WH as /api/webhooks/stripe
  participant DB as orders / order_items

  C->>API: items + discountCode
  API->>API: validate stock/prices server-side
  API->>S: checkout.sessions.create
  S-->>C: url redirect
  S->>WH: checkout.session.completed + signature
  WH->>DB: idempotent insert by stripe_session_id
  WH->>DB: decrement stock, clear cart, discount usage
```

## 7. Admin sensitive data path

```mermaid
flowchart LR
  AdminUI[Admin UI]
  API[/api/admin/*]
  Auth[requireStaff / requireAdmin]
  Client[staffDataClient or createServiceClient]
  DB[(Postgres)]

  AdminUI --> API --> Auth --> Client --> DB
```

**Note (Code):** When `SUPABASE_SERVICE_ROLE_KEY` is set, many admin writes use the service role and therefore **bypass RLS**. Authorization then rests entirely on the require* checks. Production policy effectiveness: **Unknown**.

## 8. Major module map

| Module | Path | Role |
|---|---|---|
| Catalog | `src/lib/catalog-server.ts` | Server reads + cache |
| Sort | `src/lib/locale-sort.ts` | Arabic alpha sort |
| Homepage sections | `src/lib/homepage-sections.ts` | Section normalize/dedupe |
| Layout builder | `src/lib/layout-builder.ts` | CSS variables document |
| Admin auth | `src/lib/admin-server.ts` | Staff/admin gates |
| Middleware | `src/middleware.ts` + `supabase/middleware.ts` | Session + admin gate |
| Cart | `src/context/CartContext.tsx` | Guest/auth cart |
| Wishlist | `src/context/WishlistContext.tsx` | Guest/auth wishlist |
| Image pipeline | `src/lib/compress-image.ts`, `image-editor/*` | Upload/edit |
| Stripe | `src/lib/stripe.ts`, `api/checkout`, `api/webhooks/stripe` | Payments |
| i18n shop | `src/lib/shop-i18n.ts`, `ShopLocale.tsx` | AR/DE strings |
| i18n admin | `src/lib/admin-i18n.ts` | AR/DE admin |

## Unknown / unverified connections

- External CDN for `@imgly` ONNX models at runtime — Inferred from comments in `next.config.ts`  
- Exact production Supabase project schema parity with `supabase/migrations` — Unknown  
- Email delivery for auth magic links — Supabase-managed (Inferred)