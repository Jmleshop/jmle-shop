# CLAUDE.md — jmle shop (Jomlah)

Online shop for the brand **jmle** (Arabic RTL + German storefront, admin back office).
Read `docs/CLAUDE_HANDOVER.md` before any non-trivial task; workflow in `docs/DEVELOPMENT_WORKFLOW.md`; accounts/tools in `docs/ACCESS_AND_SETUP.md`.

## Stack
- Next.js 15 App Router + React 19 + TypeScript, Tailwind 3, npm (`package-lock.json`)
- Supabase (Postgres + RLS, Auth, Storage bucket `product-images`) — no Edge Functions
- Stripe Checkout + webhook; WhatsApp / callback / delivery "inquiry" checkout (`/api/inquiries`)
- Hosted on Vercel (production host `jmle-shop.vercel.app`, see `src/lib/app-url.ts`)
- GitHub: `Jmleshop/jmle-shop`

## ⚠️ Branch situation (verify before every task)
Since 2026-10-25 local `main` tracks `origin/main` (the base; likely production). The older WhatsApp-checkout work lives on local `whatsapp-checkout` (tracks `origin/whatsapp-checkout`) and is being ported file-by-file — **do not `git merge` it** (it carries ~40 stale storefront files, 23 conflicts). See `docs/CLAUDE_HANDOVER.md` §2. Never push to `origin/main` or reset branches without explicit approval. Run `git status -sb` first.

## Key paths
- `src/middleware.ts` + `src/lib/supabase/middleware.ts` — session refresh + admin gate (roles `admin`/`employee`)
- `src/lib/admin-server.ts` — `requireStaff()` / `requireAdmin()`; every `/api/admin/*` route must call one
- `src/lib/supabase/{client,server,public,admin}.ts` — browser / cookie / anon / service-role clients
- `src/lib/catalog-server.ts` — catalog reads (anon view `products_public`, service-role fallback)
- `src/app/api/checkout`, `src/app/api/webhooks/stripe` — payments
- `supabase/migrations/` — versioned SQL; loose `supabase/*.sql` files were run manually in the SQL Editor

## Commands
- `npm run dev` (http://localhost:3000) · `npm run build` · `npm run lint` · `npx tsc --noEmit`
- Tests: `node --import ./scripts/register-ts.mjs --test src/lib/*.test.ts src/lib/image-editor/*.test.ts`

## Rules
- Before claiming a change works: run `npx tsc --noEmit`, the tests, and `npm run build`; report real output.
- Never read, print, or commit secret values (`.env.local`, keys). Document variable *names* only.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only; never import `@/lib/supabase/admin` into client components.
- Prices/totals must be computed server-side from the DB, never trusted from the client.
- Database changes: new file in `supabase/migrations/` (timestamped, idempotent). Never run SQL against production without explicit approval; prefer read-only queries.
- No production deploys, env-var changes, DNS, or auth-setting changes without explicit approval.
- Match existing style: German UI/comment strings in code, Arabic + German user texts via `shop-i18n.ts` / `admin-i18n.ts`.
- Keep changes small; update `docs/CLAUDE_HANDOVER.md` when architecture changes.
