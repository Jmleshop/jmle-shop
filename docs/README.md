# jmle-shop — Technical Audit Documentation

**Audit date:** 2026-10-16  
**Branch (docs):** `cursor/full-audit-docs-84bd`  
**Method:** Source-code inspection + lockfile versions + safe local HTTP timings where noted.  
**Not performed:** Production DB inspection, dependency upgrades, migrations, deployments, destructive tests.

## Navigation

| Document | Contents |
|---|---|
| [../PROJECT_STATUS.md](../PROJECT_STATUS.md) | Executive status (start here) |
| [TECH_STACK.md](./TECH_STACK.md) | Verified technologies & dependency usage |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System diagrams & request flows |
| [ROUTE_MAP.md](./ROUTE_MAP.md) | Every App Router page & API route |
| [FEATURE_INVENTORY.md](./FEATURE_INVENTORY.md) | Feature completeness matrix |
| [UI_UX_AUDIT.md](./UI_UX_AUDIT.md) | Storefront & admin design audit |
| [ASSET_AND_MEDIA_AUDIT.md](./ASSET_AND_MEDIA_AUDIT.md) | Images, logos, favicon, upload pipeline |
| [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) | Defensive security findings |
| [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) | Schema & data flows from repo SQL |
| [PERFORMANCE_AUDIT.md](./PERFORMANCE_AUDIT.md) | Bottlenecks & measured local timings |
| [TESTING_AND_QUALITY.md](./TESTING_AND_QUALITY.md) | Tests, lint, quality gaps |
| [ACCESSIBILITY_AND_I18N.md](./ACCESSIBILITY_AND_I18N.md) | RTL, a11y, localization |
| [IMPROVEMENT_ROADMAP.md](./IMPROVEMENT_ROADMAP.md) | Prioritized next steps (no implementation) |

## Evidence legend (used in all docs)

| Tag | Meaning |
|---|---|
| **Code** | Confirmed by reading source |
| **Lockfile** | Version from `package-lock.json` |
| **Test** | Confirmed by running a listed command |
| **Local** | Safe GET against local Next.js |
| **Inferred** | Reasonable inference, not verified |
| **Unknown** | Insufficient access/evidence |

## Scope notes

- Application behavior was **not** changed by this audit (docs only).
- README at repo root is partially outdated (still mentions JSON catalog); these docs supersede it for architecture.
- Prior agent work on brands/sort/banner may already exist on other branches; this audit describes the tree as inspected.