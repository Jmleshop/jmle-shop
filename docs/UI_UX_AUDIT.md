# UI/UX Audit — Storefront & Admin

Evidence: **Code** (tokens, components, structure). Visual browser walkthrough of every page was **not** fully re-executed in this documentation pass. Prior Phase-2 screenshots/timings inform some judgments (marked **Local/Prior**).

## A. Global visual identity

### Design language (Code)

- Warm cream backgrounds (`jmle.cream` `#FFF7ED`), orange brand (`#FF6B00`), deep red/mahogany accents (`#7F1D1D`).  
- Defined in `tailwind.config.ts` under `gold`, `brand`, `jmle`, `luxury`.  
- Shadows: `shadow-gold`, `shadow-boutique`.  
- Motion: boutique easing; cart bump/glow keyframes.  
- Radii: frequent `rounded-2xl` cards.

### Typography (Code)

- Site: Google fonts Tajawal (UI), Noto Sans Arabic (body), Amiri (display) via `layout.tsx`.  
- PDF path uses Cairo from `public/fonts/` (not main CSS).  
- Arabic RTL via `ShopLocale` / `dir` handling — presence confirmed; full RTL QA **Unverified**.

### Token system

- **Partial design tokens** in Tailwind + CSS variables for layout builder (`--layout-*` in `globals.css` / `layout-builder.ts`).  
- No separate design-system package (no shadcn/MUI). Shared primitives under `src/components/ui`.  
- Risk: arbitrary utility classes mixed with tokens → inconsistency (Inferred).

### Themes

- No dark-mode theme toggle found (Code). Light cream storefront + dark admin sidebar (`luxury-black` which is mahogany).

## B. Storefront review

| Area | Observation | Severity | Evidence |
|---|---|---|---|
| Header / search | Search integrated in header (`HeaderSearch`) | OK | Code |
| Brand strip | CSS marquee + arrows; single section when normalize runs | OK / prior fix | Code |
| Hero banners | `CompactBannerSlider`; cover default in builder | Needs visual QA | Code |
| Category nav | Grid + header tree | OK | Code |
| Product cards | 1:1 frames, contain, bilingual titles | OK structure | Code |
| Filters/sorting on catalog | **No facet UI** on `/products` | High UX gap | Code |
| Pricing | Sale/original + badges | OK | Code |
| Cart/checkout | Functional flow; trust badges present | OK | Code |
| Footer | Logo prop discarded — branding weak | Medium | Code `SiteFooter.tsx` |
| Favicon | Missing | Medium | Code |
| Empty/error | Root `error`/`not-found`; some empty states in brand/category | Partial | Code |
| Mobile | `FooterNav`, responsive grids | Needs device QA | Code |
| Trust | Some badges; legal templates may still be placeholders | Medium | Code/README |

### Professional grocery benchmark (pattern check, not copy)

| Pattern | jmle-shop |
|---|---|
| Clear discovery | Partial — search yes; facets weak |
| Consistent grids | Yes (2/4 cols) |
| Filters & sort | Weak on catalog page |
| Pricing clarity | Good |
| Photo quality | Pipeline exists; asset quality Unknown |
| Brand coherence | Orange/cream identity present; footer/favicon gaps |
| Action feedback | Cart fly animation; toasts mainly admin |

## C. Admin review

| Area | Observation | Severity | Evidence |
|---|---|---|---|
| Sidebar IA | Core catalog present; **orders/discounts/users missing** | High | Code |
| Dashboard | Welcome + 3 count cards only | Medium density | Code |
| Tables | Custom `AdminTable`; sticky headers common | OK | Code |
| Forms | Large products form; Zod server validation | OK | Code |
| Confirmations | Trash uses `confirm()` | OK / dated UX | Code |
| Image workflows | Strong (upload/editor/freisteller) | Strength | Code |
| Orders/Discounts/Users | Sparse UI, DE-hardcoded copy on orders/discounts | Medium | Code |
| i18n | Admin DE/AR via `admin-i18n` | Partial coverage on older pages | Code |
| Employee UX | Analytics hidden; commerce pages still reachable by URL if admin-only middleware allows only admin | OK gate | Code |
| Mobile admin | Side drawer via `AdminShell` (assumed) | Needs QA | Code |
| Consistency | Mix of boutique cards vs plain tables; gold CTA | Medium inconsistency | Code |

## D. Design recommendations (audit only — do not implement here)

P2-focused:

1. Add sidebar + dashboard entry points for commerce admin.  
2. Unify admin copy to `admin-i18n` on orders/discounts/users.  
3. Restore footer logo; add favicon.  
4. Add catalog filters (category already routed; brand/price optional).  
5. Replace bare `confirm()` with consistent modal pattern.  
6. Audit arbitrary spacing vs token scale.  
7. Avoid decorative motion that hurts performance; keep purposeful feedback.

## What was not verified visually in this pass

- Pixel-perfect review of every admin screen on mobile  
- Color contrast WCAG measurements  
- Keyboard-only walkthrough of checkout  
- Screenshot regression suite  

Mark those **Unverified**.