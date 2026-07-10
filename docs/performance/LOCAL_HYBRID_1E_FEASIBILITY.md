# Local Hybrid 1E — Static Export / Local Bundled Assets Feasibility

**Branch:** `feature/local-hybrid-build16`  
**Date:** 2026-07-10  
**Phase:** 1E-A Audit + 1E-B Dry Run (feasibility only — no Capacitor / iOS changes)

---

## Executive Summary

| Question | Answer |
|----------|--------|
| Can BetterBit move from Remote URL WebView to local bundled assets? | **Yes, conditionally** |
| Is `output: 'export'` safe for Vercel production? | **No** — must remain env-gated |
| Did `npm run build` (normal) survive? | **Yes** |
| Did `npm run build:ios-local` produce `out/`? | **No** — blocked (see below) |
| Can 1E-C (Capacitor `webDir` / `server.url`) proceed after fixes? | **Yes, after 1E-pre blockers resolved** |

**Recommended strategy:** **方案 A + B** — env-gated `next.config` + dedicated `build:ios-local` script that excludes `src/app/api` during export (API remains on Vercel).

---

## 1E-A Audit

### Commands run

```bash
rg "force-dynamic|headers\(|cookies\(|server action|use server|getServerSideProps|getInitialProps|redirect\(|notFound\(|NextResponse|middleware" app src pages middleware.ts next.config.*
rg "fetch\('/api|fetch\(\"/api|credentials: 'include'|credentials: \"include\"" src app pages components lib
rg "server.url|betterbit.app|webDir|capacitor-www|out" capacitor.config.* package.json scripts ios src
```

### Remaining RSC / SSR blockers (user-facing pages)

| File | Blocker | Impact on static export |
|------|---------|-------------------------|
| `src/app/(app)/layout.tsx` | Async server layout; `getAppProfile()` + `redirect()` | **High** — must become client auth gate before export |
| `src/app/page.tsx` | `force-dynamic`; server `createClient()` + `redirect()` | **Medium** — landing redirect must be client-side for iOS shell |
| `src/app/growth/page.tsx` | `force-dynamic` | **Low** — internal founder tool; exclude from iOS bundle |
| `src/app/growth/new/page.tsx` | `force-dynamic` | **Low** — exclude from iOS bundle |

**Four primary app pages (1D complete):** No RSC blockers in route `page.tsx` files.

| Page | Route | Status |
|------|-------|--------|
| Today | `/dashboard` | ✅ Client shell |
| Record | `/weekly` | ✅ Client shell |
| Analysis | `/progress` | ✅ Client shell |
| Settings | `/settings/*` | ✅ Client shell |

### Remaining server actions

| File | Status |
|------|--------|
| `src/app/(app)/dashboard/generate-plan-action.ts` | Orphaned `'use server'` — unused; safe to delete in cleanup |

### Remaining relative `/api` calls

| Location | Count | Notes |
|----------|-------|-------|
| `src/` | **0** | All user-facing calls use `apiFetch` |
| `scripts/qa/run-food-log-persist-e2e.mjs` | 2 | E2E script only (against remote base URL) |

### Remaining `credentials: include`

| Location | Count |
|----------|-------|
| `src/` | **0** |
| `scripts/qa/` | 0 (uses `credentials: 'same-origin'` in e2e) |

### Routes safe for static export

After resolving `(app)/layout.tsx` client gate:

- `/dashboard`, `/weekly`, `/progress`, `/settings` (+ all settings subpages)
- `/login`, `/register`, `/onboarding`
- `/privacy`, `/terms`, `/support`
- `/settings/premium` (client loader; RevenueCat client-side)

### Routes unsafe / exclude from iOS bundle

- `/api/*` — **35 API route handlers** — must stay on Vercel (remote)
- `/growth`, `/growth/new` — internal tools
- `/` — needs client redirect instead of server redirect

### API routes that must remain remote (Vercel)

All 35 routes under `src/app/api/`:

- Auth: `register`, `confirm-email`, `change-password`
- Core: `checkin`, `generate-plan`, `food-photo`, `calorie-bank`, `measurements`
- Settings: `settings/profile`, `settings/goals`, `settings/body`, `settings/preferences`
- IAP: `apple-iap/sync`, `get-subscription`, `create-subscription`, `cancel-subscription`, `billing-portal`
- Webhooks/cron: `webhooks/stripe`, `cron/*`, `send-notifications`
- Growth: `growth/*` (internal)

iOS local shell calls these via `apiFetch` → `NEXT_PUBLIC_API_BASE_URL`.

### Middleware risk

| Item | Detail |
|------|--------|
| `src/proxy.ts` | Supabase session middleware (`updateSession`) — runs on Vercel, **not in static bundle** |
| Static Capacitor | No Next.js middleware; auth via Supabase client + Bearer JWT (already implemented in 1B) |
| Risk | Cookie-based session refresh won't run locally — **mitigated** by Bearer token in `apiFetch` |

### Next Image risk

| Item | Detail |
|------|--------|
| Usage | 1 file: `FoodPhotoThumb.tsx` |
| Mitigation | `images.unoptimized: true` when `NEXT_PUBLIC_BUILD_TARGET=ios-local` |

### Dynamic route risk

| Route | Type | iOS impact |
|-------|------|------------|
| `api/measurements/[id]` | API (remote) | None in bundle |
| `api/growth/posts/[id]` | API (remote) | None in bundle |
| App pages | All static paths | ✅ No dynamic page segments in user-facing routes |

### Auth redirect risk

| Current | iOS local requirement |
|---------|----------------------|
| `(app)/layout.tsx` server `redirect('/login')` | Client layout guard: check Supabase session → redirect |
| `page.tsx` server redirect logged-in users | Client `useEffect` redirect |
| Login/onboarding | Already client-side ✅ |

### IAP risk

| Item | Status |
|------|--------|
| RevenueCat / PurchasesPlugin | Untouched |
| `PremiumScreen` | Client component; Stripe hidden on iOS via `shouldHideExternalPaymentsClient` |
| `api/apple-iap/sync` | Remote on Vercel |
| Risk level | **Low** — no IAP logic changes needed for export |

---

## Architecture Decision: Dual Build Target

### ✅ Correct (approved approach)

```
Vercel production (npm run build):
  - Normal Next.js server + API routes
  - No output: export
  - Cookie + Bearer auth on API

iOS local (npm run build:ios-local):
  - NEXT_PUBLIC_BUILD_TARGET=ios-local
  - output: 'export' → out/
  - src/app/api excluded during build (restored after)
  - NEXT_PUBLIC_API_BASE_URL=https://betterbit.app
  - Capacitor webDir → out (1E-C, not yet)
```

### ❌ Forbidden

- Global `output: 'export'` on `npm run build`
- Removing API routes from the repo
- Merging to `main` or production deploy during 1E-A/B

### Implementation (1E-B)

| File | Change |
|------|--------|
| `next.config.ts` | Env-gated `output: 'export'` + `images.unoptimized` + skip `headers()` for ios-local |
| `package.json` | `"build:ios-local": "node scripts/build-ios-local.mjs"` |
| `scripts/build-ios-local.mjs` | Sets `NEXT_PUBLIC_BUILD_TARGET=ios-local`; moves `api/` aside during build |

---

## 1E-B Dry Run Results

### `npm run build` (normal)

```
PASS — Vercel production build unaffected
API routes present
No output: export
```

### `npm test`

```
PASS — 698 tests
```

### `npm run build:ios-local`

**Attempt 1** (with `api/` present):

```
FAIL at page data collection
Error: route "/api/check-free-upgrade" incompatible with output: export
```

**Root cause:** Next.js `output: 'export'` cannot coexist with any `src/app/api/*` route handlers.

**Attempt 2** (script moves `api/` aside):

```
FAIL — EPERM on Windows rename (src/app/api → api.__ios_local_bak)
Environment file lock — retry on Mac CI or use copy-based exclusion
```

**Predicted blockers after api/ exclusion** (code review):

1. `src/app/(app)/layout.tsx` — server auth layout
2. `src/app/page.tsx` — server redirect
3. Possibly `growth/*` routes (exclude or mark static)

### `out/` generated?

**No** — dry run did not complete.

---

## Capacitor Current State (1E-C design only — NOT modified)

| Setting | Current value |
|---------|---------------|
| Mode | Remote URL WebView |
| `server.url` | `https://betterbit.app` |
| `webDir` | `capacitor-www` (offline placeholder HTML) |
| Offline placeholder | "目前離線" retry page |

### Recommended 1E-C changes (pending human approval)

```text
capacitor.config.ts (production Build 16):
  - Remove server.url (or gate behind BUILD_TARGET)
  - webDir: 'out'
  - Keep allowNavigation for betterbit.app API domain

package.json:
  - testflight:prep → run build:ios-local before cap sync (Mac only)

testflight-prep.mjs:
  - Verify webDir is out/ not capacitor-www
  - Verify server.url absent for Build 16
  - Keep PurchasesPlugin check

ios/:
  - npx cap sync ios (Mac only, after 1E-C approval)
```

---

## API_BASE_URL / CORS

| Env | Value |
|-----|-------|
| Default | `https://betterbit.app` (via `NEXT_PUBLIC_API_BASE_URL` → `NEXT_PUBLIC_APP_URL` fallback) |
| Preview test | `<preview-deployment-url>` |

CORS allowlist already includes `capacitor://localhost` (1B).

---

## Offline Launch Expectation (1F+, not implemented)

```
Flight mode open app:
  ✅ Local HTML/JS/CSS shell loads (no white screen)
  ⏳ Skeleton / offline message if no cache
  ⏳ Cached data if local cache exists (1F)
```

1E-A/B only confirms **assets can be bundled** — cache layer is 1F.

---

## 1E-Pre Blockers — RESOLVED (2026-07-10)

| Priority | Blocker | Fix | Status |
|----------|---------|-----|--------|
| P0 | API routes vs export | Exclude to `.ios-local-staging/` during build | ✅ |
| P0 | `(app)/layout.tsx` server auth | `AppAuthGuard` client guard | ✅ |
| P1 | `page.tsx` server redirect | `RootRedirectClient` | ✅ |
| P2 | `growth/*` | Excluded during ios-local build | ✅ |
| P2 | `generate-plan-action.ts` | Deleted (no runtime refs) | ✅ |
| P2 | `robots.ts` / `sitemap.ts` | `dynamic = 'force-static'` | ✅ |

`npm run build:ios-local` **PASS** — `out/` generated with all primary routes.

### 1E-C — Capacitor local bundled assets (2026-07-10)

| Item | Status |
|------|--------|
| `capacitor.config.ts` | `webDir: out`, no `server.url` (prod) |
| Dev override | `CAPACITOR_DEV_SERVER_URL` only |
| `npm run ios:local:prep` | Added |
| `npx cap sync ios` | PASS — assets copied to `ios/App/App/public` |
| `ios/.../capacitor.config.json` | No `server.url`, `webDir: out` |
| Online smoke (Mac) | Pending — need feature Vercel preview URL |
| Airplane smoke (Mac) | Pending — Mac Run required |

Branch pushed: `feature/local-hybrid-build16` → await Vercel preview deploy for API_BASE_URL.

---

## 1E-Pre Blockers (original audit)

| Priority | Blocker | Fix |
|----------|---------|-----|
| P0 | API routes incompatible with `output: export` | `build:ios-local` excludes `src/app/api` during build |
| P0 | `(app)/layout.tsx` server auth | Client `AppLayoutClient` with session guard |
| P1 | `page.tsx` server redirect | Client redirect for logged-in users |
| P2 | `growth/*` in bundle | Exclude from iOS build or leave as static pages |
| P2 | Orphaned `generate-plan-action.ts` | Delete in cleanup |
| P2 | Windows EPERM on api/ rename | Use copy-based exclusion or Mac CI for dry run |

---

## Human Decisions Needed

1. **Approve 1E-pre:** Client-side `(app)/layout.tsx` auth gate?
2. **Approve api/ exclusion** in `build:ios-local` as permanent dual-target strategy?
3. **Exclude `/growth`** from iOS bundle?
4. **When to run 1E-C** on Mac (cap sync + TestFlight Build 16)?

---

## Can Rollback

Yes — revert `next.config.ts`, `package.json`, `scripts/build-ios-local.mjs` on branch. No Capacitor/iOS changes made.

---

## Next Recommended Action

1. **Human approval** → **1E-C** Capacitor `webDir: out`, remove `server.url`, Mac `cap sync`
2. **Verify `out/`** in browser via `npx serve out` with `NEXT_PUBLIC_API_BASE_URL` set
3. TestFlight Build 16 on Mac

**Do NOT:** merge main, production deploy until 1E-C validated.
