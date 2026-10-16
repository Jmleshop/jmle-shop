# Technology Stack (Verified)

Evidence: **Lockfile** = `package-lock.json`; **Code** = import/usage search under `src/`.

## Runtime & app framework

| Technology | Declared | Installed (lockfile) | Usage |
|---|---|---|---|
| Node.js | no `engines` field | Host: v22.14.0 (Local) | Assumed ≥18 per README |
| Next.js | `^15.1.3` | **15.5.20** | App Router entire `src/app` |
| React / React DOM | `^19.0.0` | **19.2.7** | UI |
| TypeScript | `^5.7.2` (dev) | **5.9.3** | Strict project (`tsconfig.json`) |

**Architecture (Code):** React Server Components by default; `"use client"` on interactive islands (cart, admin forms, marquees, builder).

## Frontend libraries

| Package | Installed | Prod/Dev | Actual usage (Code) |
|---|---|---|---|
| `tailwindcss` | 3.4.19 | Dev (build) | `tailwind.config.ts`, `globals.css` |
| `lucide-react` | 0.469.0 | Prod | Icons storefront + admin |
| `framer-motion` | 13.4.2 | Prod | **Narrow:** `SwipeToDeleteRow.tsx` only (not brand marquee) |
| `react-hot-toast` | 2.6.1 | Prod | Admin toasts via `AppToaster` |
| `recharts` | 3.10.1 | Prod | Admin analytics charts |
| `@dnd-kit/*` | 6.3.1 / 10.0.0 | Prod | Categories reorder + builder structure |
| `zod` | 4.6.5 | Prod | API/body validation (`src/lib/validations/*`) |
| `react-easy-crop` | 6.2.3 | Prod | Image editor |
| `@imgly/background-removal` | 1.7.0 | Prod | Client freisteller (dynamic); heavy WASM excluded from Vercel tracing |
| `browser-image-compression` | 2.0.2 | Prod | Fallback in `compress-image.ts` |
| `sharp` | 0.35.4 | Prod | Server image optimize paths |
| `@react-pdf/renderer` | 4.9.0 | Prod | Invoice/delivery PDFs + price labels |
| `xlsx` | 0.18.5 | Prod | Category Excel import/export |

### Declared but unused / weakly used

| Package | Installed | Finding |
|---|---|---|
| `@stripe/stripe-js` | 5.10.0 | **No imports under `src/`** (Code search). Checkout redirects to Stripe-hosted URL via server session. Likely unused client dependency. |

## Backend & integrations

| Concern | Technology | Evidence |
|---|---|---|
| API style | Next.js Route Handlers `src/app/api/**/route.ts` | Code |
| Server Actions | None found (`"use server"` absent) | Code |
| Auth | Supabase Auth (email/password, OTP verify, OAuth callback) | Code |
| DB client | `@supabase/ssr` + `@supabase/supabase-js` | Code |
| Privileged DB | `createServiceClient()` + `SUPABASE_SERVICE_ROLE_KEY` | Code |
| Storage | Bucket `product-images` | Code |
| Payments | `stripe` server SDK; webhook at `/api/webhooks/stripe` | Code |
| Translation | `/api/translate` — DeepL optional / MyMemory free | Code + `.env.example` |
| Analytics | First-party `page_views` + admin analytics APIs | Code |
| Email product | Not found as dedicated service | Unknown/none in code |
| Background jobs | CLI scripts under `scripts/` only | Code |
| Rate limiting | Not found | Code |
| APM/Sentry | Not found | Code |

## Styling & fonts

- Tailwind theme tokens: orange/cream/mahogany (`tailwind.config.ts`) — Code  
- Google fonts via `next/font`: Tajawal, Noto Sans Arabic, Amiri (`src/app/layout.tsx`) — Code  
- Local Cairo TTFs in `public/fonts/` — used in PDF paths (Code: PriceLabelPdf), not main site CSS  

## Tooling

| Tool | Present | Notes |
|---|---|---|
| npm | Yes (`package-lock.json`) | Primary |
| ESLint | `eslint` 9.39.5 + `eslint-config-next` | `npm run lint` |
| Prettier | **No** config file found | — |
| Vitest/Jest | **No** | Tests via Node `tsx --test` on `*.test.ts` |
| CI (GitHub Actions) | **No** `.github/` | — |
| Scripts | `dev`, `build`, `start`, `lint`, `brand-reset` | `package.json` |

## Environment variables (names only)

From `.env.example` (Code):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`
- Optional: `DEEPL_API_KEY`, `MYMEMORY_EMAIL`, `HF_TOKEN`, `SUPABASE_URL`

**No secret values documented here.**

## Hosting / deploy

- Production host constant: `jmle-shop.vercel.app` (`src/lib/app-url.ts`) — Code  
- Middleware redirects other `*.vercel.app` preview hosts → production — Code  
- `next.config.ts`: image remotePatterns, AVIF/WebP, `outputFileTracingExcludes` for ONNX/WASM — Code  
- `.vercelignore` present — Code  

## Image delivery

- `next/image` formats AVIF/WebP; qualities 75/80; weekly `minimumCacheTTL` — Code (`next.config.ts`)  
- Remote hosts: Unsplash + Supabase project hostname + local Supabase — Code  

## Maintainability concerns (Informational)

1. Multiple overlapping SQL schema files under `supabase/` (drift risk) — Code  
2. Root README still describes JSON catalog — outdated vs Phase-3 Supabase — Code  
3. Unused `@stripe/stripe-js` dependency — Code  
4. No CI pipeline — Code  
5. No `engines` pin for Node — Code