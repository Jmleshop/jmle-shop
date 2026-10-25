# Access & Setup

Never paste secrets into chat or commit them. Put local values in `.env.local` (git-ignored) and production values in Vercel → Project → Settings → Environment Variables.

## Accounts the project depends on
| Service | Used for | Owner action needed |
|---|---|---|
| GitHub `Jmleshop/jmle-shop` | source code, PRs | Fetch works from this Mac; push access unverified |
| Vercel | hosting, `jmle-shop.vercel.app` | Log in to see deployments/env vars |
| Supabase | DB, auth, storage | Dashboard login; project ref is the subdomain of `NEXT_PUBLIC_SUPABASE_URL` |
| Stripe | card payments | Test keys for local dev; live keys only in Vercel |
| DeepL (optional) | translation | API key if better translation wanted |

## Local tools on this Mac (2026-10-25)
| Tool | Status | Purpose |
|---|---|---|
| Node 24.18 / npm 11.16 | installed | run/build the app |
| git 2.50 | installed | version control |
| Homebrew 7.0 | installed | installs the tools below |
| GitHub CLI `gh` | missing | PRs, branches, CI from Claude |
| Supabase CLI | missing | migrations, `db dump`, local DB (needs Docker) |
| Vercel CLI | missing | deployment logs, env var names, rollbacks |
| psql | missing | not needed if Supabase CLI/MCP is used |

Install commands (run only after approval):
```bash
brew install gh
```
```bash
brew install supabase/tap/supabase
```
```bash
npm install -g vercel
```
Then authenticate each in your own terminal: `gh auth login`, `supabase login`, `vercel login` (browser-based login; no keys in chat).

## Configure `.env.local`
Variable names in `.env.example`. Currently missing locally: `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API) and real Stripe **test** keys (Stripe → Developers → API keys; webhook secret via `stripe listen` or the dashboard). Use test keys only locally.

## Production configuration to verify (in dashboards)
- Vercel: production branch, all variables from `.env.example` set, `NEXT_PUBLIC_APP_URL` = production domain.
- Supabase Auth: Site URL + redirect `https://<domain>/auth/callback`.
- Stripe: webhook endpoint `https://<domain>/api/webhooks/stripe`, event `checkout.session.completed`.
