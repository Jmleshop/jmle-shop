# Route Map

Every `page.tsx` and `route.ts` discovered under `src/app` (Code).  
Layouts: `src/app/layout.tsx` (root), `src/app/admin/(dashboard)/layout.tsx` (+ analytics/activity nested layouts).

Global UX shells: `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx` at app root; extra loaders under `products/[id]` and `categories`.

---

## Public storefront

| URL | File | Auth | Data | Key UI | Limits / notes | Verify |
|---|---|---|---|---|---|---|
| `/` | `app/page.tsx` | Public | homepage sections, slides, brands, categories, offers | `HomepageSectionsRenderer`, banners, brands ticker | Section-driven; brands dedupe in normalize | Code |
| `/products` | `products/page.tsx` | Public | `getProductsAsync` | `ProductGrid` | No facet filters found | Code |
| `/products/[id]` | `products/[id]/page.tsx` | Public | product by id | Gallery, info, sticky ATC | — | Code |
| `/categories` | `categories/page.tsx` | Public | categories | `CategoryGrid` | — | Code |
| `/categories/[id]` | `categories/[id]/page.tsx` | Public | category + products | grid + children | Sale/all specials via helpers | Code |
| `/brands/[id]` | `brands/[id]/page.tsx` | Public | brand + products | logo header + grid | Filter via brand_id + fallbacks | Code |
| `/search` | `search/page.tsx` | Public | `searchProductsAsync` | results grid | `noindex`; q query | Code |
| `/cart` | `cart/page.tsx` | Public | CartContext | line items | Guest/auth | Code |
| `/checkout` | `checkout/page.tsx` | Public* | cart + `/api/checkout` | summary, discount | Redirects to Stripe | Code |
| `/checkout/success` | `checkout/success/page.tsx` | Public | session success | clears discount storage | — | Code |
| `/wishlist` | `wishlist/page.tsx` | Public | WishlistContext | list + ATC | Guest/auth | Code |
| `/profile` | `profile/page.tsx` | Customer | profile + orders | OrderHistory + PDFs | No profile edit UI | Code |
| `/auth/login` | `auth/login/page.tsx` | Public | Supabase password | form | redirect support | Code |
| `/auth/register` | `auth/register/page.tsx` | Public | signup + profile upsert | form | → verify | Code |
| `/auth/verify` | `auth/verify/page.tsx` | Public | OTP | form | — | Code |
| `/auth/callback` | `auth/callback/route.ts` | Public | code exchange | redirect | — | Code |
| `/legal/impressum` | `legal/impressum/page.tsx` | Public | static | LegalLayout | Placeholder business data risk | Code |
| `/legal/datenschutz` | `legal/datenschutz/page.tsx` | Public | static | LegalLayout | Template | Code |
| `/legal/widerruf` | `legal/widerruf/page.tsx` | Public | static | LegalLayout | Template | Code |
| `/robots.txt` | `robots.ts` | Public | — | — | — | Code |
| `/sitemap.xml` | `sitemap.ts` | Public | catalog URLs | — | — | Code |

\*Checkout usable as guest; Stripe collects shipping address.

### Storefront mobile

- Root layout includes `FooterNav`, `DevicePreviewToggle`, `ShopLocaleProvider` — Code  
- Touch targets often `min-h-11` — Code  
- Full device QA: **Unknown** (not re-run in this audit)

---

## Admin UI

| URL | File | Role | Notes | Verify |
|---|---|---|---|---|
| `/admin/login` | `admin/login/page.tsx` | Public | Staff password login | Code |
| `/admin` | `admin/(dashboard)/page.tsx` | Staff | Likely redirect/alias to dashboard | Code |
| `/admin/dashboard` | `.../dashboard/page.tsx` | Staff | Counts via full products fetch | Code |
| `/admin/products` | `.../products/page.tsx` | Staff | Full CRUD + images + sort | Code |
| `/admin/categories` | `.../categories/page.tsx` | Staff | Tree, DnD, Excel | Code |
| `/admin/sliders` | `.../sliders/page.tsx` | Staff | Slides + brands section UI | Code |
| `/admin/builder` | `.../builder/page.tsx` | Staff | Visual layout builder | Code |
| `/admin/site` | `.../site/page.tsx` | Staff | Name, logo, sections | Code — **no favicon** |
| `/admin/inventory` | `.../inventory/page.tsx` | Staff | Stock display (edit via products) | Code |
| `/admin/trash` | `.../trash/page.tsx` | Staff | Soft-delete restore/purge | Code |
| `/admin/orders` | `.../orders/page.tsx` | **Admin** | Read-only; **not in sidebar** | Code |
| `/admin/discounts` | `.../discounts/page.tsx` | **Admin** | Create+list; **not in sidebar** | Code |
| `/admin/users` | `.../users/page.tsx` | **Admin** | Read-only; **not in sidebar** | Code |
| `/admin/analytics` | `.../analytics/page.tsx` | Admin | Redirect → finance | Code |
| `/admin/analytics/finance` | finance page | Admin | Charts | Code |
| `/admin/analytics/products` | products page | Admin | Charts | Code |
| `/admin/analytics/traffic` | traffic page | Admin | Charts | Code |
| `/admin/activity` | activity page | Admin | Audit log UI | Code |

Sidebar source of truth: `src/components/admin/AdminSidebar.tsx` (orders/discounts/users omitted).

---

## Public API routes

| Method / Path | File | Auth | Purpose |
|---|---|---|---|
| GET `/api/products` | `api/products/route.ts` | Public | Product fetch (ids/fields) |
| GET `/api/search` | `api/search/route.ts` | Public | Search suggestions |
| POST `/api/checkout` | `api/checkout/route.ts` | Public | Create Stripe session |
| POST `/api/discounts/validate` | `api/discounts/validate/route.ts` | Public | Validate code |
| POST `/api/analytics/pageview` | `api/analytics/pageview/route.ts` | Public | Page view beacon |
| POST `/api/translate` | `api/translate/route.ts` | Public* | Auto-translate helper |
| POST `/api/webhooks/stripe` | `api/webhooks/stripe/route.ts` | Stripe sig | Order creation |

\*Translate may use optional API keys server-side.

## Admin API routes (all under middleware gate)

| Path | Auth helper | Notes |
|---|---|---|
| `/api/admin/me` | requireStaff | Profile/role |
| `/api/admin/products` (+`[id]`, csv, numbers) | requireStaff | CRUD |
| `/api/admin/categories` (+id, excel, reorder) | requireStaff | CRUD |
| `/api/admin/brands` (+reset) | staff / admin reset | Logos |
| `/api/admin/slides` | requireStaff | Hero slides |
| `/api/admin/site` | requireStaff | Site JSON + logo |
| `/api/admin/layout` | requireStaff | Layout draft/publish |
| `/api/admin/builder/content` | requireStaff | Sections/orders draft |
| `/api/admin/trash` | requireStaff | Soft delete ops |
| `/api/admin/optimize-product-image` | requireStaff | Image ops |
| `/api/admin/remove-background` | requireStaff | Freisteller |
| `/api/admin/frame-product-image` | requireStaff | Framing |
| `/api/admin/reprocess-all-images` | requireAdmin | Bulk |
| `/api/admin/force-reset-brands` | requireAdmin | Dangerous reset |
| `/api/admin/orders` | requireAdmin | GET list |
| `/api/admin/discounts` | requireAdmin | GET+POST only |
| `/api/admin/users` | requireAdmin | GET list |
| `/api/admin/stats` | requireAdmin | Stats |
| `/api/admin/activity` | requireAdmin | Audit |
| `/api/admin/analytics/*` | requireAdmin | Finance/products/traffic |

Unauthenticated GETs to sample admin APIs returned **HTTP 401** (Local, prior audit).

---

## Major user journeys

| # | Journey | Status |
|---|---|---|
| 1 | Discover product (home/categories) | **Implemented** (Code) |
| 2 | Search product/brand text | **Implemented** (Code) |
| 3 | Browse category | **Implemented** (Code) |
| 4 | Brand page products | **Implemented** (Code); empty if no `brand_id`/match |
| 5 | Add to cart | **Implemented** (Code) |
| 6 | Checkout + pay | **Implemented** (Code); prod Stripe **Unknown** |
| 7 | Webhook confirms payment | **Implemented** (Code); prod endpoint **Unknown** |
| 8 | Customer views orders | **Implemented** on `/profile` (Code) |
| 9 | Admin manages products | **Implemented** (Code) |
| 10 | Admin manages orders/discounts/users | **Partial** — APIs/pages exist, nav missing, write paths incomplete |
| 11 | Employee permitted actions | **Partial** — middleware blocks admin-only; sidebar hides analytics |
| 12 | Admin homepage/banners/logos | **Implemented** builder/site/sliders (Code); favicon missing |

### Broken / incomplete journey steps (Code)

- Discover Orders/Discounts/Users via sidebar → **broken discovery**  
- Deactivate discount → **not implemented**  
- Change user role → **not implemented**  
- Update order status in admin → **not implemented**  
- Set browser favicon in site settings → **not implemented**  
- Footer shows shop logo → **broken** (`SiteFooter` voids logo prop)