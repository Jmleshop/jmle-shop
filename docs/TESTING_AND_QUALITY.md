# Testing & Code Quality

## Available npm scripts (`package.json`)

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Local server |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve build |
| `lint` | `next lint` | ESLint |
| `brand-reset` | tsx script | Destructive brand reset utility |

**No `test` script.** No Vitest/Jest/Playwright/Cypress dependencies.

## Unit tests present (Code)

Under `src/lib/**/*.test.ts` (and `image-editor/`):

- `brand-match`, `brand-name`
- `category-product-guard`
- `center-image-square`, `image-bounds`, `image-quality`
- `image-editor` (bg-postprocess, cutout-mask-repair, image-editor)
- `homepage-sections`, `layout-builder`, `locale-sort`
- `price-label-layout`, `shipping`, `site-settings`

Runner pattern used in repo: `./node_modules/.bin/tsx --test <files>`.

### Executed this audit (2026-10-16)

```text
./node_modules/.bin/tsx --test \
  src/lib/homepage-sections.test.ts \
  src/lib/locale-sort.test.ts \
  src/lib/layout-builder.test.ts \
  src/lib/shipping.test.ts
```

**Result: 17 tests, 4 suites, pass 17 / fail 0** — **Test**.

Not run this pass: full `*.test.ts` suite, `next lint`, `next build`, `tsc --noEmit` (to avoid mutating `tsbuildinfo` unnecessarily; tsc was green in prior work).

## Gaps (no coverage found)

- API authz matrix (employee vs admin vs anon)  
- Checkout + Stripe webhook integration  
- RLS policy tests  
- Playwright/e2e storefront journeys  
- RTL visual tests  
- Upload malware/MIME tests  
- CI pipeline (no `.github/workflows`)  

## Lint / format

- ESLint via `eslint.config.mjs` + `eslint-config-next`  
- **No Prettier** config found  
- TypeScript `tsconfig.json` present  

## Quality observations

| Topic | Finding |
|---|---|
| Dead code | `HeroSlider.tsx` unused; `@stripe/stripe-js` unused |
| Docs drift | Root README JSON catalog outdated |
| Dual catalog modules | `catalog.ts` (legacy helpers) vs `catalog-server.ts` |
| Error handling | Mix of JSON `{error}` and thrown Errors |
| `any` / loose types | Some admin fetch `as` casts — maintainability |

## Safe commands for future verification

```bash
npm run lint
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/tsx --test src/lib/**/*.test.ts src/lib/image-editor/*.test.ts
```

Do not run `brand-reset` or force-reset APIs without explicit approval (destructive).