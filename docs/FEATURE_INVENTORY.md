# Feature Inventory

Status keys: **Full** · **Partial** · **Missing** · **Dead code** · **Unverified**

---

## Storefront commerce

| Feature | Purpose | Key files | Data | Role | Status | Gaps | Tests |
|---|---|---|---|---|---|---|---|
| Homepage sections | Compose home | `HomeSections`, `homepage-sections.ts` | `site_settings` | Public | Full | Duplicate brands if normalize bypassed | Unit dedupe **Test** |
| Hero banners | Promo media | `CompactBannerSlider` | `hero_slides` | Public | Full | Legacy `HeroSlider` unused (**Dead**) | — |
| Brand ticker | Partner logos | `BrandLogoTicker` | `brand_logos` | Public | Full | Needs visual QA | Unit sections |
| Brand filter page | Products by brand | `brands/[id]`, `getProductsByBrandAsync` | `brand_id` | Public | Full | Text-fallback side effects | — |
| Category tree FE | Browse | `CategoryGrid`, category pages | `categories` | Public | Full | — | Guard unit |
| Product grid | Listing | `ProductCard`/`ProductGrid` | products | Public | Full | No facets on `/products` | Arabic sort unit |
| Product detail | PDP | `products/[id]` | product | Public | Full | — | — |
| Search | Discovery | `HeaderSearch`, `/search`, `/api/search` | RPC/ILIKE | Public | Full | No brand facet | — |
| Arabic sort | α order | `locale-sort.ts` | `name_ar` | Public | Full | Missing `name_ar` → end | **Test** |
| Cart | Basket | `CartContext` | localStorage / `cart_items` | Public | Full | — | — |
| Wishlist | Save items | `WishlistContext` | localStorage / `wishlist_items` | Public | Full | — | SQL feature file |
| Discount at checkout | Codes | checkout page + validate API | `discount_codes` | Public | Partial | Admin cannot disable via UI | — |
| Stripe checkout | Pay | `/api/checkout` | Stripe session | Public | Full | Prod config Unverified | — |
| Webhook orders | Persist sale | `/api/webhooks/stripe` | `orders` | System | Full | Prod Unverified | — |
| Profile orders + PDF | History | `profile`, `OrderHistory`, InvoicePdf | `orders` | Customer | Full | No profile edit | — |
| Legal pages | Compliance | `/legal/*` | static | Public | Partial | Placeholder business data | — |
| i18n AR/DE | Locale | `ShopLocale`, `shop-i18n` | client storage | Public | Full | Auto-translate quality Unverified | — |
| Page views | Analytics | `PageViewTracker` | `page_views` | Public | Full | — | — |

## Admin catalog & content

| Feature | Files | API | Status | Gaps |
|---|---|---|---|---|
| Products CRUD | `admin/.../products` | `/api/admin/products*` | Full | Heavy list load |
| Product images + editor | `ImageUpload`, `ImageEditorModal` | optimize/remove-bg/frame | Full | Client MIME primarily |
| Categories + Excel + DnD | categories page | categories* / excel / reorder | Full | — |
| Brands logos CRUD | sliders brands UI | `/api/admin/brands` | Full | Reset is admin-only dangerous |
| Slides/banners | sliders | `/api/admin/slides` | Full | — |
| Site settings | site page | `/api/admin/site` | Partial | No favicon |
| Visual builder | builder + LayoutBuilderClient | layout + builder/content | Full | COEP/iframe quirks |
| Inventory view | inventory page | products GET | Partial | No inline stock edit |
| Trash | trash page | `/api/admin/trash` | Full | confirms present |
| Soft delete helpers | `admin-soft-delete.tsx` | — | Full | — |
| Price label PDF | `PriceLabelPdf` | — | Full | — |
| Reprocess all images | — | reprocess-all-images | Full | Admin-only |
| Force brand reset | products UI / API | force-reset-brands | Full | Destructive |

## Admin commerce & people

| Feature | Files | API | Status | Gaps |
|---|---|---|---|---|
| Orders list | `orders/page.tsx` | GET orders | Partial | No sidebar; no status update |
| Discounts | `discounts/page.tsx` | GET+POST | Partial | No sidebar; no PATCH/DELETE |
| Users list | `users/page.tsx` | GET profiles | Partial | No sidebar; no role update; employee label wrong |
| Analytics | analytics/* | analytics APIs | Full | Admin-only |
| Activity log | activity | activity API | Full | Admin-only |
| Dashboard metrics | dashboard | me+products+categories | Partial | Full product fetch for counts |

## Cross-cutting

| Feature | Status | Notes |
|---|---|---|
| Staff roles employee/admin | Partial | Middleware enforces; UI incomplete for users |
| Service-role admin data | Implemented | Security tradeoff — see SECURITY_AUDIT |
| Caching / revalidateTag | Implemented | 60s catalog cache |
| WhatsApp order helper | Partial | Placeholder phone `whatsapp-order.ts` |
| Fallback catalog | Present | `fallback-catalog.ts` if DB empty |
| JSON product file | Obsolete | README still mentions; live is Supabase |

## Buttons / UI without backend (examples)

| UI | Backend | Finding |
|---|---|---|
| Discount “Aktiv/Inaktiv” badge | No toggle API | Display only (Code) |
| Users role badge | No PATCH | Display only (Code) |
| Orders status chip | No update API | Display only (Code) |
| Sidebar missing links | Pages exist | Discovery broken (Code) |

## Edge cases called out in code

- Brand products: cache → DB → same-name id → text match + persist `brand_id`  
- Checkout: rejects OOS / over max qty; recomputes prices server-side  
- Webhook: idempotent on `stripe_session_id`  
- Homepage brands: `dedupeBrandsSections` keeps first by sortOrder  

## Test coverage summary

Unit tests exist for brand matching, locale sort, homepage sections, layout builder, shipping, image bounds/quality, category guards — **not** for checkout/webhook/authz matrix/e2e. See TESTING_AND_QUALITY.md.