# Technical Handover — jmle shop

Audit date: 2026-10-25 (Claude). Based on the local folder `/Users/mafghani963/Jomlah` at commit `e5a26a0`.
Labels: **[verified]** = checked in code or by running it · **[unverified]** = not checked / needs production access.

## 1. What it is
B2C/B2B online shop for jmle (food/grocery-style products with weights, VAT, max order quantities). Storefront in Arabic (RTL, default) and German; German legal pages (Impressum, Datenschutz, AGB). Admin back office for products, categories, brands, sliders, orders, inquiries/invoices, discounts, users, analytics, trash, image editing. [verified in code]

## 2. ⚠️ Repository state (most important)
- Remote: `https://github.com/Jmleshop/jmle-shop.git`. ~73 remote branches, most `cursor/*` from Cursor cloud agents. [verified]
- Local `main` tracks **`origin/whatsapp-checkout`** and is in sync with it. [verified]
- Merge base with `origin/main` is `0780ac2` (2026-09-30). Since then:
  - `origin/main` has **107 commits** (179 files, ~19k lines added): brands catalog, homepage builder/dynamic sections, atomic discount usage, image pipeline, favicon fix, "redeploy restored website to production" (latest 2026-10-19). [verified]
  - Local has **2 commits** (WhatsApp/custom checkout + admin invoice editor; PLZ/city delivery check — 53 files). [verified]
- Which branch Vercel deploys to production is [unverified] — likely `main`.
- **2026-10-25 switch:** old local `main` renamed to `whatsapp-checkout`; new local `main` created from `origin/main`. The `.env.example` edit (adds `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) is in `git stash` "env.example: publishable key line". An older Cursor stash (admin dashboard/sidebar, 3 files, 2026-10-22) also exists — untouched.
- **Porting the WhatsApp work:** a trial merge gives 23 conflicts, all from ~40 unrelated storefront files in commit `a401f64` (and it deletes `src/lib/fallback-catalog.ts`). The feature itself ports cleanly:
  - new on main: `api/inquiries`, `api/admin/inquiries`, `api/delivery-check`, `components/cart/CartRequestPanel.tsx`, `components/cart/QuotePdf.tsx`, `lib/inquiry.ts`, 3 migrations (`20261021000001`, `20261022000001`, `20261022000002`)
  - unchanged on main since base (take whatsapp version): `admin/(dashboard)/orders/page.tsx`, `lib/whatsapp-order.ts`, `lib/supabase/middleware.ts` (adds `/api/admin/inquiries` to admin-only)
  - hand-merge: `app/cart/page.tsx`, `lib/shop-i18n.ts`
  - left out pending owner review: legal pages + `CookieBanner.tsx` (+249 lines), other storefront changes.
  - Ported 2026-10-25 on branch `feat/whatsapp-checkout` (uncommitted). Decisions: cart keeps the Stripe "Checkout" button (whatsapp version had removed it) with `CartRequestPanel` below it; `shop-i18n.ts` unchanged (whatsapp side only added sort/filter labels for the left-out catalog controls); panel's Datenschutz link → `/legal/datenschutz`.
  - Open: panel links to `/agb`, which does not exist on main (no AGB page). Panel texts are German-only (storefront default is Arabic). Panel sends the PLZ from the browser to `openplzapi.org` (third party — mention in Datenschutz).
- `SQL Editor | jmle-shop | ... Supabase.html` (saved dashboard page) is committed to git. No keys found in it by pattern search, but it is junk and should be removed from the repo. [verified]

## 3. Architecture
```
Browser ──► Vercel (Next.js 15)
             ├─ middleware.ts: preview-host → prod redirect, Supabase session refresh, /admin + /api/admin role gate
             ├─ Server Components / Route Handlers (src/app/**)
             │    ├─ anon client (public.ts)    → products_public view, categories, hero_slides, site_settings
             │    ├─ cookie client (server.ts)  → user-scoped data under RLS
             │    └─ service client (admin.ts)  → webhook, inquiries, admin users/orders/stats, catalog fallback
             ├─ /api/checkout → Stripe Checkout Session (prices recomputed server-side)
             └─ /api/webhooks/stripe → creates orders/order_items (signature verified, idempotent)
Supabase: Postgres + RLS, Auth (email), Storage bucket `product-images`
External: Stripe, DeepL (optional) / MyMemory (fallback) translation, WhatsApp deep links
```

## 4. Directory structure
- `src/app/` pages: `/`, `/products`, `/products/[id]`, `/categories`, `/categories/[id]`, `/search`, `/cart`, `/checkout`, `/checkout/success`, `/wishlist`, `/profile`, `/auth/{login,register,verify,callback}`, legal pages, `/admin/login`, `/admin/(dashboard)/*`.
- `src/app/api/` public: `checkout`, `webhooks/stripe`, `inquiries`, `delivery-check`, `discounts/validate`, `products`, `search`, `translate`, `analytics/pageview`. Admin: `api/admin/*` (23 routes).
- `src/components/` (storefront, `admin/`, `cart/`, `profile/`, `ui/`), `src/context/` (Cart, CartFly, Wishlist), `src/lib/` (business logic), `src/types/`.
- `supabase/migrations/` (9 files) + ~16 loose SQL scripts in `supabase/` that were meant to be pasted into the SQL Editor.
- `scripts/`: image reprocessing, duplicate-product finder, TS loader for tests, Cursor cloud-agent setup scripts (Linux, not for this Mac).
- `data/`: legacy; catalog now lives in Supabase.

## 5. Auth & authorization [verified in code]
- Supabase email auth; `/auth/callback` exchanges the code. Profiles in `public.profiles` with `role ∈ {customer, admin, employee}`, created by trigger `handle_new_user`.
- Middleware gates `/admin/**` and `/api/admin/**` (staff); some prefixes admin-only (`ADMIN_ONLY_PREFIXES`).
- Every `/api/admin/*` route also calls `requireStaff()`/`requireAdmin()` (checked all 23).
- SQL helpers `is_admin()`, `is_staff()` (SECURITY DEFINER).
- A migration hard-codes one user UUID as admin (`20240101000001_consolidate.sql`).

## 6. Database [verified from SQL files; live schema unverified]
Tables used by code: `products`, `products_public` (view), `categories`, `brand_logos`, `profiles`, `orders`, `order_items`, `cart_items`, `wishlist_items`, `discount_codes`, `hero_slides`, `site_settings`, `inquiries`, `page_views`, `audit_log`, `shop_products`.
- RLS enabled on the tables defined in migrations; `inquiries` admin-only; `cart_items` own-user policies (commerce migration).
- **Migrations are incomplete**: features like wishlist, page_views, trash/soft-delete, audit log, phase-1 security hardening, catalog search exist only as loose `supabase/*.sql` files. Whether they were applied to production is unknown.
- **Security**: `migrations/…consolidate.sql` lets users `UPDATE` their own profile row with no column restriction. The trigger `protect_profile_role` that blocks self-promotion to `admin` exists only in `supabase/phase1-security-rls.sql` (not a migration, also not in `origin/main` migrations). If it was never run in production, any registered customer can make themselves admin from the browser. **Must verify on production first.**

## 7. Storage / Edge Functions
- Bucket `product-images` (admin upload, public URLs; `next.config.ts` allows `<project>.supabase.co/storage/v1/object/public/**`). Bucket policies [unverified].
- No Supabase Edge Functions in the repo. [verified]

## 8. Environment variables (names only)
| Name | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | public key (publishable preferred) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | bypasses RLS: webhook, inquiries, admin users/orders/stats |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe | payments |
| `NEXT_PUBLIC_APP_URL` | both | absolute URLs / Stripe redirects |
| `DEEPL_API_KEY`, `MYMEMORY_EMAIL` | server, optional | auto-translation DE↔AR |

Local `.env.local` state [verified by shape, values not read]: Supabase URL + public key set; **service-role key commented out** (admin users/orders/inquiries/webhook won't work locally); **Stripe values are still the `.env.example` placeholders**; app URL = localhost.

## 9. Baseline results (2026-10-25, local code)
- `npx tsc --noEmit`: **fails** — `src/components/FooterNav.tsx:71` `'badge' is possibly 'undefined'`.
- `npm run build`: **fails** on the same error (so this branch cannot deploy as-is).
- Lint: passes with 4 warnings (a11y in `HeaderSearch.tsx`, hook deps in `ImageEditorModal.tsx`).
- Tests (node:test): 23 pass, 1 file fails to load — `src/lib/shipping.ts` imports via `@/lib` alias which the test loader can't resolve.
- `npm audit --omit=dev`: 8 advisories (1 critical `next`, high: `sharp`, `zod`, `@imgly/background-removal`, `postcss`, `nanoid`, `source-map-js`).
- Dev server / UI: not yet run.

## 10. Known issues & tech debt
1. Diverged branches (section 2) — must be reconciled before any deploy.
2. Possible privilege escalation via `profiles.role` (section 6).
3. `/api/inquiries` stores client-supplied `unitPrice`/`vatRate`/totals without checking DB prices; no rate limit (spam). Admin invoices are built from this data.
4. `/api/translate` is public and unlimited → can burn DeepL quota.
5. `/api/analytics/pageview` is public, no rate limit (analytics spam).
6. Build-breaking TS error; one test can't load.
7. Schema history split between migrations and loose SQL files; no reliable way to rebuild prod DB from repo.
8. `next lint` deprecated (Next 16); README has empty code blocks and outdated structure.
9. Many stale `cursor/*` branches.

## 11. Still to verify
- Which Git branch/commit is live on Vercel; Vercel project settings and env vars.
- Live Supabase schema, RLS policies, presence of `trg_protect_profile_role`, storage policies, auth redirect URLs.
- Stripe mode (test/live) and webhook endpoint in production.
- Whether the WhatsApp-checkout work should be merged onto `origin/main`.
