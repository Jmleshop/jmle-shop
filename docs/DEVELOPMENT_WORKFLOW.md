# Development Workflow

## Run locally
```bash
npm install          # only after package.json/lockfile changes or a fresh clone
npm run dev          # http://localhost:3000, admin at /admin/login
```
Needs `.env.local` (copy `.env.example`; see `docs/ACCESS_AND_SETUP.md`). Without `SUPABASE_SERVICE_ROLE_KEY`, admin users/orders/inquiries and the Stripe webhook fail locally. Without real Stripe test keys, card checkout fails.

## Check a change
```bash
npx tsc --noEmit
node --import ./scripts/register-ts.mjs --test src/lib/*.test.ts src/lib/image-editor/*.test.ts
npm run lint
npm run build
```
`npm run build` must pass before anything is deployed — Vercel runs the same build.

## Per-task loop
1. Understand the request; locate files (`docs/CLAUDE_HANDOVER.md` §4).
2. `git status -sb` — note branch and uncommitted work.
3. Plan; ask for approval if it touches DB, auth, payments, or production.
4. Implement on a feature branch (`git switch -c feat/<name>`).
5. Run the checks above; try the flow in the browser (`npm run dev`).
6. Review `git diff`; commit with a clear message.
7. Push + open a PR on GitHub; Vercel builds a preview.
8. Merge to the production branch only after approval → Vercel deploys.

## Deploy (Vercel)
Vercel deploys automatically from GitHub pushes (assumed; verify in Vercel → Project → Settings → Git). Normal path: PR → preview → merge. Manual alternative: `vercel --prod` (Vercel CLI, needs login) — only with explicit approval.
Note: `middleware.ts` redirects `*.vercel.app` preview hosts to the production host, so previews may bounce to production; check this when testing previews.

## Recover from a bad change
- Uncommitted: `git restore <file>` (or `git stash` to keep it aside).
- Committed, not pushed: `git reset --soft HEAD~1`.
- Pushed/deployed: `git revert <sha>` + push, or in Vercel → Deployments → previous deployment → "Promote to Production" (instant rollback).

## Change Supabase safely
1. Write a new timestamped file in `supabase/migrations/` (idempotent: `IF NOT EXISTS`, `DROP POLICY IF EXISTS`).
2. Test against a local/staging DB if available (`supabase start` needs Docker + Supabase CLI).
3. Back up first (Supabase → Database → Backups, or `supabase db dump`).
4. Apply to production only with approval (SQL Editor or `supabase db push`).
5. Never edit old migrations; never run destructive SQL (`DROP`, `DELETE`, `TRUNCATE`) without a backup and approval.

## Common errors
- `Type error ... possibly 'undefined'` during build → fix the type, rerun `npx tsc --noEmit`.
- `NEXT_PUBLIC_SUPABASE_URL fehlt` → `.env.local` missing/incomplete; restart `npm run dev` after editing it.
- `Missing Supabase service role configuration` → service-role key not set (server only).
- 401/403 on `/api/admin/*` → not logged in, or profile role not `admin`/`employee`.
- Images not showing → host not in `next.config.ts` `remotePatterns`.
