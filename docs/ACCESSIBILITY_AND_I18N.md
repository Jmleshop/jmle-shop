# Accessibility & Internationalization

## Localization (Code)

| Concern | Implementation | Status |
|---|---|---|
| Shop languages | `ShopLocale` — `ar` / `de`, localStorage | Implemented |
| Shop strings | `src/lib/shop-i18n.ts` | Large key set |
| Admin strings | `src/lib/admin-i18n.ts` | Partial; some pages hardcoded German (orders/discounts) |
| Auto translate | `useAutoTranslate` + `/api/translate` | Optional DeepL / MyMemory |
| Product names | `name_ar` + `name_de` fields | Required on create (Zod) |
| Currency | EUR formatting helpers | Implemented |
| RTL | Arabic UI direction handling | Present in code; **full QA Unverified** |
| Sitemap/robots | `sitemap.ts`, `robots.ts` | Implemented |
| SEO metadata | Root + page `generateMetadata`, JsonLd | Implemented |

## Accessibility observations (Code / inferred)

| Check | Finding | Evidence |
|---|---|---|
| Icon-only controls | Many have `aria-label` (cart, wishlist, brand nav) | Code samples |
| Marquee reduced motion | `prefers-reduced-motion` disables animation | `globals.css` |
| Focus styles | Some `focus-visible:ring` on product links | Code |
| Forms labels | Admin forms generally labeled | Code |
| Dialogs | Image editor / modals — a11y depth Unverified | — |
| Color contrast | Orange on cream — **not measured** (WCAG tools not run) | Unverified |
| Keyboard checkout | Unverified | — |
| Skip links | Not found | Missing? |
| Live regions / toasts | react-hot-toast in admin | Code |
| Touch targets | Frequent `min-h-11` | Code |
| Screen reader product names | Image alts often product titles | Code |

## RTL risks to verify later

1. Marquee forced `direction: ltr` for animation — intentional but may feel odd in RTL.  
2. Chevron `rtl:rotate-180` on brand arrows — present.  
3. Mixed DE admin pages without RTL.  
4. PDF invoices language — check `InvoicePdf`.  

## i18n gaps

- Orders/Discounts admin pages: German hardcoded strings (Code).  
- Users page: German hardcoded.  
- WhatsApp helper placeholder number (Code).  
- Legal pages: template placeholders (README warning).  

## Recommendations (audit only)

1. Finish admin i18n for commerce pages.  
2. Run axe/Lighthouse a11y on home, PDP, checkout, admin products.  
3. Measure contrast for `brand-orange` on cream/white.  
4. Add skip-to-content link in root layout.  
5. Manual RTL checklist for cart badges and sticky ATC.