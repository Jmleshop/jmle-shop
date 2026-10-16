# Security Audit (Defensive, Read-Only)

**Scope:** Source inspection + sample unauthenticated local API checks.  
**Not performed:** Production penetration, secret scanning of `.env.local` contents, dependency CVE auto-fix, RLS live evaluation against prod.

Severity: Critical · High · Medium · Low · Informational

---

## Findings

### S1 — Service role used for staff CRUD after auth
- **Severity:** High (Critical if require* bypassed or bug)
- **Files:** `src/lib/admin-server.ts` (`staffDataClient`), many `/api/admin/*`, orders/users/discounts routes using `createServiceClient()`
- **Evidence:** Code comments state preference for service role to avoid RLS drift
- **Impact:** RLS policies do not constrain these queries; compromise of a staff session or auth bug yields full table access
- **Conditions:** `SUPABASE_SERVICE_ROLE_KEY` set (typical in prod)
- **Remediation:** Prefer authenticated staff client with correct RLS; keep service role for webhooks/idempotent system jobs only; add integration tests for authz matrix
- **Verified:** Code pattern confirmed; prod key presence Unknown

### S2 — Admin commerce endpoints require admin (positive)
- **Severity:** Informational / positive control
- **Files:** `supabase/middleware.ts` ADMIN_ONLY_PREFIXES; `requireAdmin` on orders/discounts/users
- **Evidence:** Local unauth → HTTP 401 (Prior Local)
- **Impact:** Unauthenticated access blocked in local check
- **Verified:** Local sample; employee 403 path Code-confirmed logic, not re-exercised with real employee session in this pass

### S3 — Upload validation largely client-side
- **Severity:** Medium
- **Files:** `ImageUpload.tsx`, `compress-image.ts`
- **Evidence:** `accept="image/*"` + `startsWith("image/")`; Storage upload from browser session
- **Impact:** Malicious or oversized files depending on Storage policies; SVG XSS if ever served inline (currently WebP forced — mitigates)
- **Remediation:** Server-side size/MIME/content checks; Storage allowed MIME list
- **Verified:** Code; Storage policies Unknown

### S4 — Stripe webhook signature + idempotency
- **Severity:** Informational / positive (when secret configured)
- **Files:** `api/webhooks/stripe/route.ts`
- **Evidence:** `constructEvent`, reject missing secret/signature; idempotent `stripe_session_id`
- **Impact:** Forged events blocked if secret set; missing secret returns 500 misconfigured
- **Verified:** Code; production secret Unknown

### S5 — Checkout prices not trusted from client
- **Severity:** Informational / positive
- **Files:** `api/checkout/route.ts`
- **Evidence:** Loads catalog products, recomputes line prices, stock checks
- **Verified:** Code

### S6 — Discount / order / user mutation gaps
- **Severity:** Medium (integrity / ops)
- **Evidence:** No PATCH/DELETE discounts; no order status transitions; no user role update API
- **Impact:** Cannot revoke codes from UI; privilege changes require DB
- **Remediation:** Controlled admin mutations with audit log
- **Verified:** Code

### S7 — Schema / RLS drift risk
- **Severity:** High (uncertainty)
- **Files:** Multiple `supabase/*.sql` + `migrations/`
- **Evidence:** Parallel consolidate/feature/schema files
- **Impact:** App may use service role to mask broken RLS; public views may differ
- **Verified:** Repo files exist; deployed state Unknown

### S8 — Public translate / pageview endpoints
- **Severity:** Low–Medium
- **Files:** `/api/translate`, `/api/analytics/pageview`
- **Evidence:** Public POST without observed rate limit
- **Impact:** Abuse / cost (DeepL) / log spam
- **Remediation:** Rate limit, auth optional, quotas
- **Verified:** No rate limit found (Code)

### S9 — Preview host redirect
- **Severity:** Informational
- **Files:** `middleware.ts`, `app-url.ts`
- **Evidence:** Forces production host for `*.vercel.app` previews
- **Impact:** Good for canonical URLs; can surprise preview testing
- **Verified:** Code

### S10 — Secrets handling
- **Severity:** Informational
- **Evidence:** `.env.example` documents server-only service role; `.gitignore` expected for `.env.local`
- **Do not commit secrets.** This audit did not print secret values.
- **Verified:** Example file only

### S11 — IDOR (orders/profile)
- **Severity:** Needs review
- **Evidence:** Profile loads orders for session user (Code pattern). Admin orders use service role after requireAdmin.
- **Customer IDOR:** Not fully threat-modeled line-by-line in this pass — mark **Unverified**
- **Remediation:** Explicit `.eq("user_id", user.id)` review + tests

### S12 — Dependency vulnerabilities
- **Severity:** Unknown
- **Evidence:** `npm audit` not run (would be read-only but noisy; not executed this pass)
- **Remediation:** Run `npm audit` in a later controlled step

---

## AuthN/Z matrix (Code)

| Actor | Storefront | Staff catalog admin | Orders/Discounts/Users/Analytics |
|---|---|---|---|
| Anonymous | Yes | No (401/redirect) | No |
| Customer | Yes | No | No |
| Employee | Yes | Yes | No (middleware redirect/403) |
| Admin | Yes | Yes | Yes |

---

## Claims we do **not** make

- That production RLS is correctly applied  
- That the live site is free of XSS/CSRF issues  
- That Storage bucket is locked down  
- That Stripe live mode is correctly configured  

---

## Recommended security work order

1. Inventory every `createServiceClient` / `staffDataClient` call site.  
2. Prove RLS with staff JWT for catalog CRUD in staging.  
3. Add role-update & discount-revoke with audit logging.  
4. Server-side upload validation.  
5. Rate-limit public POST APIs.  
6. Authz integration tests (employee vs admin).