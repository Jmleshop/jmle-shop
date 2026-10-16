# Improvement Roadmap

**Purpose:** Prioritized, evidence-based recommendations from the 2026-10-16 audit.  
**Constraint:** This document does **not** authorize implementation. Implement in controlled, separate PRs after review.

Evidence tags follow [`docs/README.md`](./README.md). Complexity: **S**mall · **M**edium · **L**arge.

---

## Priority legend

| Priority | Meaning |
|---|---|
| **P0** | Critical security, payment integrity, data exposure, or data-loss risk |
| **P1** | Broken or incomplete core shopping / ops journeys |
| **P2** | Major storefront/admin UX, discovery, images, navigation |
| **P3** | Performance, accessibility, i18n consistency, maintainability |
| **P4** | Visual polish and nonessential enhancements |

---

## Recommended implementation sequence (high level)

1. **Prove production trust boundaries** (P0): staging RLS check, service-role inventory, Stripe webhook config confirmation.  
2. **Unblock admin commerce ops** (P1): sidebar links → discount lifecycle → order status → user roles.  
3. **Storefront trust basics** (P2): favicon, footer logo, catalog facets.  
4. **Performance hygiene** (P3): dashboard counts, homepage query slim, pagination as catalog grows.  
5. **Quality gates** (P3): authz integration tests, CI, a11y/RTL checklist.  
6. **Polish** (P4): dead-code removal, design-token cleanup, optional motion.

Do not batch unrelated P0/P1/P2 work into one PR.

---

## P0 — Critical / trust boundary

### P0-1 — Inventory and constrain service-role usage
| Field | Detail |
|---|---|
| Severity | High (Critical if auth gate fails) |
| Impact | Staff session or auth bug → full DB via `createServiceClient` / `staffDataClient` |
| Evidence | **Code** — `src/lib/admin-server.ts`, admin APIs; see SECURITY_AUDIT S1 |
| Files | `admin-server.ts`, `/api/admin/*`, orders/discounts/users routes |
| Dependencies | Staging Supabase with RLS enabled; employee + admin test users |
| Complexity | L |
| Sequence | First security workstream |
| Success | Catalog CRUD works with staff JWT + RLS; service role limited to webhook/system jobs |
| Tests | Authz matrix (employee/admin/anon) against each mutation |
| Risks | Broken RLS may surface latent bugs currently masked by service role |

### P0-2 — Verify deployed RLS vs repo SQL
| Field | Detail |
|---|---|
| Severity | High (uncertainty) |
| Impact | Unknown public exposure or broken staff writes if schema/RLS drift |
| Evidence | Multiple `supabase/*.sql` + `migrations/` — SECURITY_AUDIT S7; DATABASE_ARCHITECTURE |
| Complexity | M–L (ops + review; no app redesign) |
| Sequence | Parallel with P0-1 in staging |
| Success | Single source of truth for schema; staging policies match app expectations |
| Tests | Policy smoke tests; document prod verification separately |
| Risks | Do not “fix” prod blindly; audit-only until approved |

### P0-3 — Confirm production Stripe webhook + secrets
| Field | Detail |
|---|---|
| Severity | Critical if misconfigured (orders not created / forgery if secret missing) |
| Impact | Paid sessions without orders, or webhook 500 |
| Evidence | Webhook code verifies signature (**Code**); prod config **Unknown** |
| Files | `src/app/api/webhooks/stripe/route.ts` |
| Complexity | S (ops verification) |
| Success | Live endpoint returns 200 on signed events; idempotent `stripe_session_id` observed |
| Tests | Stripe CLI / staging event replay (approved env only) |
| Risks | Do not disable signature checks |

---

## P1 — Core journeys / essential ops

### P1-1 — Wire admin sidebar to orders, discounts, users
| Field | Detail |
|---|---|
| Severity | High (ops discovery) |
| Impact | Staff cannot find existing commerce pages |
| Evidence | **Code** — pages exist; `AdminSidebar.tsx` omits links — FEATURE_INVENTORY / UI_UX |
| Files | `src/components/admin/AdminSidebar.tsx`, admin nav i18n keys |
| Complexity | S |
| Sequence | First product PR after audit merge |
| Success | Admin can open `/admin/orders`, `/admin/discounts`, `/admin/users` from nav; employee still blocked by middleware |
| Tests | Component/nav snapshot or route list unit; manual role check |
| Risks | Showing links to employees who get redirected — hide by role |

### P1-2 — Discount lifecycle (deactivate / delete)
| Field | Detail |
|---|---|
| Severity | Medium–High integrity |
| Impact | Cannot revoke codes from UI; “Aktiv/Inaktiv” is display-only |
| Evidence | **Code** — GET+POST only — FEATURE_INVENTORY / SECURITY S6 |
| Files | `src/app/admin/discounts/`, `src/app/api/admin/discounts/` |
| Complexity | M |
| Sequence | After P1-1 |
| Success | Admin can deactivate/delete; checkout rejects inactive codes |
| Tests | API tests for PATCH/DELETE + checkout validate |
| Risks | Soft-delete vs hard-delete; audit log desirable |

### P1-3 — Order status workflow
| Field | Detail |
|---|---|
| Severity | High ops |
| Impact | Orders read-only; fulfillment status not manageable in app |
| Evidence | **Code** — FEATURE_INVENTORY |
| Files | `admin/orders/`, `api/admin/orders/` |
| Complexity | M |
| Sequence | After P1-1; define allowed transitions first |
| Success | Admin updates status with validation; customer profile reflects status |
| Tests | Transition matrix; unauthorized employee 403 |
| Risks | Race with Stripe webhook status fields |

### P1-4 — User role update API + UI
| Field | Detail |
|---|---|
| Severity | High ops / security ops |
| Impact | Privilege changes require direct DB; employee label wrong in UI |
| Evidence | **Code** — FEATURE_INVENTORY |
| Files | `admin/users/`, profiles API |
| Complexity | M |
| Sequence | After P1-1; admin-only |
| Success | Admin can set `customer` / `employee` / `admin` with confirmation; self-demotion guarded |
| Tests | Role matrix; cannot escalate without admin |
| Risks | Last-admin lockout |

### P1-5 — Legal / WhatsApp placeholders
| Field | Detail |
|---|---|
| Severity | Medium compliance / trust |
| Impact | Legal pages / WhatsApp helper may show placeholder business data |
| Evidence | **Code** — FEATURE_INVENTORY, UI_UX |
| Files | `src/app/legal/*`, `whatsapp-order.ts` |
| Complexity | S |
| Success | Real imprint/privacy/terms; correct phone |
| Tests | Content review checklist |
| Risks | Legal review required outside engineering |

---

## P2 — UX, discovery, media, brand trust

### P2-1 — Favicon and app icons
| Field | Detail |
|---|---|
| Severity | Medium trust |
| Impact | Browser tab looks unfinished |
| Evidence | **Code** — no `app/icon.*` — ASSET_AND_MEDIA_AUDIT |
| Complexity | S |
| Success | Favicon renders on storefront and admin |
| Tests | Visual check; HTML link tags present |
| Risks | Cache on CDN |

### P2-2 — Footer shop logo
| Field | Detail |
|---|---|
| Severity | Medium brand |
| Impact | Footer branding weak; `logoUrl` discarded |
| Evidence | **Code** — `SiteFooter.tsx` — ASSET / UI_UX |
| Complexity | S |
| Success | Footer shows same shop logo as header when configured |
| Tests | Unit/render with logoUrl; visual |
| Risks | Broken image if URL stale |

### P2-3 — Catalog filters and sorting on `/products`
| Field | Detail |
|---|---|
| Severity | High discovery UX |
| Impact | Weak grocery-grade discovery vs search-only |
| Evidence | **Code** — no facet UI — UI_UX / FEATURE_INVENTORY |
| Complexity | M–L |
| Sequence | After P1 ops; design facets (brand, price, availability) against existing APIs |
| Success | Users filter/sort without leaving catalog; query params shareable |
| Tests | Filter URL + empty states; RTL layout |
| Risks | Perf if client-side full catalog; prefer server filters |

### P2-4 — Admin i18n consistency on commerce pages
| Field | Detail |
|---|---|
| Severity | Medium |
| Impact | DE-hardcoded orders/discounts vs `admin-i18n` elsewhere |
| Evidence | **Code** — UI_UX |
| Complexity | S–M |
| Success | All admin chrome uses `admin-i18n` for AR/DE |
| Tests | Key completeness script or snapshot |
| Risks | Missing keys fall back poorly |

### P2-5 — Server-side upload validation
| Field | Detail |
|---|---|
| Severity | Medium security/UX |
| Impact | Malicious/oversized uploads depend on client + Storage policies |
| Evidence | **Code** — SECURITY S3, ASSET audit |
| Complexity | M |
| Success | Reject non-image / oversize before Storage write |
| Tests | MIME/size rejection cases |
| Risks | Legitimate HEIC/edge formats |

### P2-6 — Replace bare `confirm()` with consistent modals
| Field | Detail |
|---|---|
| Severity | Low–Medium UX |
| Impact | Dated admin UX; inconsistent with boutique storefront |
| Evidence | **Code** — trash flows — UI_UX |
| Complexity | S |
| Success | Shared confirm dialog for destructive actions |
| Tests | Keyboard focus trap |
| Risks | Missed confirm paths |

---

## P3 — Performance, a11y, i18n, maintainability

### P3-1 — Dashboard count endpoints (no full product fetch)
| Field | Detail |
|---|---|
| Severity | High perf as catalog grows |
| Impact | Admin dashboard loads all products to count |
| Evidence | **Code** + PERFORMANCE_AUDIT |
| Files | `admin/.../dashboard/page.tsx` |
| Complexity | S |
| Success | Counts via `count`/`head` queries or dedicated RPC |
| Tests | Assert response shape; timing smoke |
| Risks | RLS count accuracy if switching off service role |

### P3-2 — Slim homepage / catalog selects
| Field | Detail |
|---|---|
| Severity | High cold TTFB |
| Impact | Local home cold TTFB ~1.55s (Local 2026-10-15) |
| Evidence | PERFORMANCE_AUDIT; `catalog-server.ts` |
| Complexity | M |
| Success | Cold TTFB improved on local; field lists documented |
| Tests | Timing before/after; cache tag still invalidates |
| Risks | Missing fields for sections |

### P3-3 — Authz + checkout/webhook integration tests
| Field | Detail |
|---|---|
| Severity | High quality risk |
| Impact | No CI; core money paths untested in suite |
| Evidence | TESTING_AND_QUALITY — no `.github`, no `npm test` script covering e2e |
| Complexity | M–L |
| Success | CI runs unit + authz matrix on PR |
| Tests | Employee 403 on admin-only; webhook idempotency fixture |
| Risks | Flaky Stripe mocks |

### P3-4 — Rate-limit public POST APIs
| Field | Detail |
|---|---|
| Severity | Low–Medium abuse |
| Impact | `/api/translate`, `/api/analytics/pageview` abuse cost |
| Evidence | SECURITY S8 |
| Complexity | M |
| Success | 429 under burst; legit traffic unaffected |
| Tests | Load smoke in staging |
| Risks | Shared IP behind NAT |

### P3-5 — Accessibility and RTL QA pass
| Field | Detail |
|---|---|
| Severity | Medium |
| Impact | Unverified contrast, keyboard checkout, full RTL |
| Evidence | ACCESSIBILITY_AND_I18N — many Unverified |
| Complexity | M |
| Success | Checklist signed off AR+DE, mobile+desktop |
| Tests | axe/lighthouse a11y; manual keyboard |
| Risks | False confidence from `dir="rtl"` alone |

### P3-6 — Schema consolidation documentation
| Field | Detail |
|---|---|
| Severity | Medium maintainability |
| Impact | Competing SQL files confuse deploy |
| Evidence | DATABASE_ARCHITECTURE |
| Complexity | M (docs + ops) |
| Success | One migration path documented; obsolete SQL marked |
| Risks | Accidental drop of needed views |

### P3-7 — Monitoring / error reporting
| Field | Detail |
|---|---|
| Severity | Medium reliability |
| Impact | Only `console.error`; no Sentry/Datadog found |
| Evidence | PERFORMANCE_AUDIT |
| Complexity | M |
| Success | Production errors alerted with PII redaction |
| Tests | Synthetic error in staging |
| Risks | Logging secrets |

---

## P4 — Polish / optional

| ID | Item | Complexity | Notes |
|---|---|---|---|
| P4-1 | Remove dead `HeroSlider` / unused `@stripe/stripe-js` if confirmed unused | S | TECH_STACK |
| P4-2 | Design-token cleanup (reduce arbitrary Tailwind) | M | UI_UX |
| P4-3 | Admin density polish (breadcrumbs, empty states) | M | After P1 commerce |
| P4-4 | Optional purposeful motion only where it aids feedback | S | Avoid decorative noise |
| P4-5 | Root README sync (remove obsolete JSON-catalog claims) | S | Docs |

---

## Top 10 improvements (ranked)

1. **P0-1** Service-role inventory + RLS-backed staff CRUD  
2. **P0-2** Deployed schema/RLS verification  
3. **P0-3** Production Stripe webhook confirmation  
4. **P1-1** Admin sidebar links for orders/discounts/users  
5. **P1-2** Discount deactivate/delete  
6. **P1-3** Order status workflow  
7. **P1-4** User role update  
8. **P2-1 / P2-2** Favicon + footer logo  
9. **P2-3** Catalog filters/sorting  
10. **P3-1 / P3-2** Dashboard counts + homepage query slim  

---

## Explicitly out of scope for immediate follow-ups

- Full visual redesign or new design system package  
- Dependency upgrades without CVE triage  
- Production data mutations or migrations without approval  
- Copying competitor grocery UI aesthetics  

---

## How to use this roadmap collaboratively

1. Pick one ID per PR.  
2. Link the relevant audit section in the PR body.  
3. Add tests listed under that ID before claiming done.  
4. Re-verify evidence tags (Code / Test / Local) after merge.  
5. Update [`PROJECT_STATUS.md`](../PROJECT_STATUS.md) when a row moves from Partial → Full.
