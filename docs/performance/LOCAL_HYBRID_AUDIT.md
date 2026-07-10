# BetterBit Local Hybrid App — Phase 0 Audit

**Date:** 2026-07-10  
**Scope:** Audit only — no functional changes in this document  
**Goal:** Assess feasibility of moving iOS from remote WebView (`https://betterbit.app`) to bundled local App Shell + remote API sync

---

## Executive Summary

| Question | Answer |
|----------|--------|
| Current iOS loading mode | **Remote URL WebView** |
| Is current iOS app a website wrapper? | **Yes** |
| Can Next.js use `output: 'export'` today? | **No** — blocked by SSR/RSC, `force-dynamic`, server actions, API routes co-located in app |
| Recommended strategy | **Situation B:** Local bundled UI + absolute `https://betterbit.app/api/*` + Supabase direct + RevenueCat native |
| Phase 1 safe to start immediately? | **No** — requires staged sub-phases; see § Blocking Issues |
| TestFlight Build 15 in progress? | **Yes** — still remote-wrapper; hybrid migration is separate |

---

## 1. Capacitor Loading Mode

### Commands run

```bash
rg "server|url|betterbit.app|webDir|capacitor" capacitor.config.* ios src
```

### Findings

**Current loading mode:** Remote URL WebView

**server.url exists:** Yes (production default)

**server.url value:**

| Source | Value |
|--------|-------|
| `capacitor.config.ts` | `process.env.CAP_SERVER_URL` → `NEXT_PUBLIC_APP_URL` → `PRODUCTION_APP_URL` (`https://betterbit.app`) |
| `ios/App/App/capacitor.config.json` (after `cap sync`) | `"url": "https://betterbit.app"` |

**webDir:** `capacitor-www`

**Local build assets today:**

| Path | Contents |
|------|----------|
| `capacitor-www/index.html` | **Placeholder only** — offline message「再健一點需要網路才能載入」 |
| `ios/App/App/public/` | Copied from `capacitor-www` on `cap sync` — not Next.js app bundle |
| `.next/` | Vercel server build — **not** copied into iOS |

**After `npx cap sync ios`, iOS actually loads:**

1. Capacitor reads `server.url` from synced `capacitor.config.json`
2. WKWebView navigates to **`https://betterbit.app`**
3. Full Next.js app runs from Vercel (SSR + client hydration)
4. `capacitor-www` is only used when remote URL unreachable → shows placeholder HTML

**Is current iOS app a website wrapper:** **Yes**

Evidence also documented in `docs/APP_STORE_42_AUDIT.md` (Guideline 4.2 risk).

### Capacitor config excerpt

```17:29:capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'app.fitai.betterbit',
  appName: '再健一點',
  webDir: 'capacitor-www',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    androidScheme: 'https',
    allowNavigation: [
      'betterbit.app',
      '*.betterbit.app',
    ],
  },
```

### Dev override (existing)

```bash
CAP_SERVER_URL=http://localhost:3000 npx cap sync ios
```

---

## 2. API Call Inventory

### Commands run

```bash
rg "fetch\(|axios|/api/|betterbit.app|NEXT_PUBLIC" src app pages components lib
```

### Summary counts

| Category | Count | Notes |
|----------|-------|-------|
| Relative `fetch('/api/...')` in `src/` | **58 call sites** across **35 files** | Will break on `capacitor://localhost` |
| `axios` usage | **0** | |
| `credentials: 'include'` with `/api` | **7** | Cookie session for checkin, food-photo, apple-iap sync |
| Absolute API via `absoluteUrl()` / `getAppUrl()` | Server/cron only | Not used by client components today |
| Supabase direct (`createClient()` browser) | Login, onboarding, logout, some settings | Works from any origin if Auth configured |
| Stripe client calls | Premium web path only | Gated off iOS via `ios-payment-gate` |

### Relative API calls (must fix for local shell)

| Endpoint | Files / usage |
|----------|----------------|
| `/api/checkin` | `mutate-today-food-log.ts`, `BetterBitHome.tsx`, `DailyCheckinView.tsx` — **meal CRUD critical** |
| `/api/food-photo`, `/api/food-photo/match` | `food-capture.ts` — photo AI |
| `/api/calorie-bank` | `BetterBitHome.tsx` |
| `/api/measurements`, `/api/measurements/[id]` | BodyData, Analytics, ProgressWeightLog, MeasurementForm |
| `/api/settings/profile` | Profile, DietPreferences |
| `/api/settings/preferences` | Notifications, Interface, Diet, Photo, Language, photo-settings-runtime, calorie-bank-user-prefs |
| `/api/settings/goals` | GoalsSettingsView |
| `/api/settings/body` | BodyDataSettingsView |
| `/api/auth/change-password` | ChangePasswordView |
| `/api/auth/register` | register page |
| `/api/get-subscription` | Settings, Premium, AppleIap |
| `/api/apple-iap/sync` | **apple-iap-client.ts — IAP critical** |
| `/api/create-subscription`, `/api/billing-portal`, `/api/cancel-subscription` | Stripe paths (web only; hidden on iOS) |
| `/api/generate-plan` | onboarding |
| `/api/delete-account` | SettingsDeleteAccountSection |
| `/api/weekly-feedback` | WeekReflection, WeeklyFeedbackForm |
| `/api/save-push-token` | firebase.ts (web push only) |
| `/api/growth/*` | Growth feature (6 call sites) — lower priority for main tabs |

### Absolute API calls (client)

None in client components today. `getAppUrl()` / `absoluteUrl()` used only in:

- `src/app/api/cron/*`, `send-notifications`, `weekly-feedback`, `robots.ts`, `sitemap.ts`, `plan-regen.ts`

### Supabase direct calls (client-safe)

| Area | Pattern |
|------|---------|
| Login | `supabase.auth.signInWithPassword` — `src/app/login/page.tsx` |
| Register flow | Mixed: `/api/auth/register` + `supabase.from(...)` upserts in onboarding |
| Logout | `supabase.auth.signOut` — V2SettingsLogoutButton, SettingsDeleteAccountSection |
| Onboarding | Direct `supabase.from('user_profiles'|'goals'|'body_measurements')` |

### Stripe calls

| File | Behavior |
|------|----------|
| `PremiumScreen.tsx` | Stripe checkout only when `!showAppleIap && !hidePayments` |
| `ios-payment-gate.ts` | Hides Stripe on Capacitor native |
| `app-store-safe-mode.ts` | `NEXT_PUBLIC_APP_STORE_SAFE_MODE=true` hides Stripe for TestFlight |

**iOS today:** Apple IAP via RevenueCat; Stripe paths not shown when IAP enabled.

### RevenueCat / IAP calls

| File | Role |
|------|------|
| `src/lib/apple-iap-client.ts` | Purchases.configure, getOfferings, purchase, restore — **native** |
| `src/lib/apple-iap-config.ts` | Env: `NEXT_PUBLIC_REVENUECAT_IOS_API_KEY`, entitlement id |
| `src/components/settings/AppleIapSubscriptionSection.tsx` | UI |
| `ios/App/App/capacitor.config.json` | `PurchasesPlugin` in `packageClassList` |
| `ios/App/CapApp-SPM/Package.swift` | `@revenuecat/purchases-capacitor` |

Server sync after purchase: `fetch('/api/apple-iap/sync')` — **must become absolute URL**.

### Auth calls

| Mechanism | Location |
|-----------|----------|
| Browser Supabase Auth | `src/lib/supabase/client.ts` — `@supabase/ssr` `createBrowserClient` |
| Server cookie Auth | `src/lib/supabase/server.ts` — used by RSC pages + all API routes |
| Session helper | `src/lib/supabase/app-session.ts` — `getAppUser()` in dashboard/weekly/progress/settings |
| Middleware | `src/lib/supabase/middleware.ts` exists but **no `src/middleware.ts`** — not active at edge |
| Auth protection | Server pages call `getAppUser()` → `redirect('/login')` |

**Risk for local shell:** RSC pages won't run without Next server. Client must use `createClient()` + `supabase.auth.getSession()` and client-side route guards.

### Image / asset calls

- `next/image` with `remotePatterns` in `next.config.ts` — export needs `images.unoptimized: true`
- Static assets in `public/` — OK for export
- Google fonts via `next/font` — OK for export

---

## 3. Next.js Static Export Feasibility

### Commands / inspection

```bash
cat next.config.ts
rg "getServerSideProps|getStaticProps|dynamic =|cookies\(|headers\(|NextResponse|route.ts" app pages src
```

### `next.config.ts` today

- **No** `output: 'export'`
- `typescript.ignoreBuildErrors: true`
- `images.remotePatterns` configured
- Custom `headers()` for cache-control on all non-static routes

### API routes

**35** route handlers under `src/app/api/` — these stay on Vercel; not bundled in iOS.

### SSR / dynamic blockers

| Blocker | Count / detail |
|---------|----------------|
| `export const dynamic = 'force-dynamic'` | **20+** pages including **dashboard, weekly, progress, settings**, all settings subpages, home, growth |
| Server Components with `getAppUser()` + Supabase server | All 4 main tabs |
| `headers()` in server code | `dashboard/page.tsx`, `generate-plan-action.ts` |
| `cookies()` via Supabase server client | All API routes + RSC data loaders |
| `'use server'` | `src/app/(app)/dashboard/generate-plan-action.ts` |
| Dynamic API route | `src/app/api/measurements/[id]/route.ts`, `growth/posts/[id]` |
| `redirect()` from server | Main app pages when unauthenticated |

### Middleware

- `src/lib/supabase/middleware.ts` — `updateSession()` implemented
- **No root `src/middleware.ts`** — auth redirects not enforced at edge; pages self-guard

### Can use `output: 'export'` today?

**No.**

### Correct approach (Situation B)

```text
iOS bundles static HTML/JS/CSS (after RSC → client migration + export)
API remains https://betterbit.app/api/*
Supabase browser client for auth + some reads
RevenueCat native unchanged
```

### Migration work required before export

1. Convert `(app)/dashboard`, `weekly`, `progress`, `settings/*` from async RSC → client pages with data hooks
2. Replace server `getAppUser()` guards with client session checks
3. Move `generate-plan-action` server action to API route or client-callable endpoint
4. Add `generateStaticParams` where dynamic segments remain (if any in app shell)
5. Set `output: 'export'`, `images.unoptimized: true`, `webDir: 'out'`
6. Bake `NEXT_PUBLIC_*` env at **build time** for iOS bundle (Supabase URL, anon key, RevenueCat key, API base URL)

---

## 4. IAP / Auth Risk Map

### IAP critical files — DO NOT BREAK

| File | Why |
|------|-----|
| `src/lib/apple-iap-client.ts` | RevenueCat configure, purchase, restore, native plugin probe |
| `src/lib/apple-iap-config.ts` | Product id, entitlement id, API key |
| `src/lib/apple-iap-store.ts` | Server-side subscription upsert |
| `src/app/api/apple-iap/sync/route.ts` | Post-purchase server sync |
| `ios/App/App/capacitor.config.json` | `PurchasesPlugin` |
| `ios/App/App.xcodeproj/project.pbxproj` | In-App Purchase capability |
| `ios/App/CapApp-SPM/Package.swift` | RevenueCat SPM |
| `src/lib/ios-payment-gate.ts` | Stripe hide on iOS |
| `src/components/settings/AppleIapSubscriptionSection.tsx` | Subscription UI |

### Auth critical files — DO NOT BREAK

| File | Why |
|------|-----|
| `src/lib/supabase/client.ts` | Browser auth |
| `src/lib/supabase/server.ts` | API route auth (server stays on Vercel) |
| `src/app/login/page.tsx` | Already client-side auth |
| `src/lib/clear-user-local-state.ts` | Logout cleanup |
| `src/lib/supabase/app-session.ts` | RSC session — refactor carefully |

### Meal / data consistency — DO NOT BREAK

| File | Why |
|------|-----|
| `src/lib/record/mutate-today-food-log.ts` | Food log mutations via `/api/checkin` |
| `src/lib/food-log-session-cache.ts` | Session cache |
| `src/lib/today-offline-cache.ts` | Today snapshot |
| `src/lib/offline-pending-sync.ts` | Pending sync marker |
| `src/app/api/checkin/route.ts` | Server persistence + calorie bank |
| `src/components/dashboard/BetterBitHome.tsx` | Today hub |

### Environment variables needed (iOS bundle build time)

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_BASE_URL=https://betterbit.app   # NEW — required for local shell
NEXT_PUBLIC_APP_URL=https://betterbit.app        # metadata / links
NEXT_PUBLIC_APPLE_IAP_ENABLED=true
NEXT_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
NEXT_PUBLIC_APPLE_IAP_PRODUCT_ID=betterbit_pro_monthly
NEXT_PUBLIC_APPLE_IAP_ENTITLEMENT_ID=BetterBit Pro
NEXT_PUBLIC_APP_STORE_SAFE_MODE=true            # TestFlight — hide Stripe
```

**Must NOT ship in bundle:**

```text
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
Any cron secrets
```

---

## 5. Existing Cache / Offline Infrastructure

Already present (partial — Today-focused):

| Module | Purpose |
|--------|---------|
| `src/lib/today-offline-cache.ts` | `bb_today_offline_v1` — today meals snapshot |
| `src/lib/food-log-session-cache.ts` | Session food logs + writes offline snapshot |
| `src/lib/offline-pending-sync.ts` | Pending sync flag |
| `src/lib/weight-measurements-session-cache.ts` | Weight chart cache |
| `src/lib/today-offline-cache.test.ts` | Tests |
| `src/components/capacitor/OfflineShell.tsx` | Offline UI — **blocks full screen without cache** |

**Gaps for Phase 1 goals:**

- No record-by-date cache
- No analysis-by-week cache
- No profile/goals/settings cache abstraction
- No subscription last-known cache
- OfflineShell copy says「需要網路才能載入你的計畫」— contradicts hybrid goal

---

## 6. CORS Status

**Current:** No `Access-Control-*` headers in any `src/app/api/**/route.ts`.

**Impact:** When App origin is `capacitor://localhost` or `http://localhost`, cross-origin `fetch('https://betterbit.app/api/...')` will fail browser preflight unless CORS added.

**Required origins (allowlist):**

```text
capacitor://localhost
http://localhost
https://localhost
https://betterbit.app
https://www.betterbit.app
```

**Cookie note:** API routes use Supabase cookie auth via `createClient()` server. Cross-origin requests from Capacitor **may not send cookies** even with `credentials: 'include'`. 

**Mitigation options (need decision):**

1. Pass Supabase JWT in `Authorization` header from client (requires API route changes)
2. Use Supabase direct for reads; API only for complex server logic
3. Capacitor HTTP plugin with cookie handling (higher risk)

**This is a blocking design decision** — audit cannot assume cookie-based API auth works cross-origin.

---

## 7. Service Worker / PWA

| Item | Status |
|------|--------|
| `public/manifest.json` | `display: standalone` — PWA installable on web |
| `firebase-messaging-sw.js` | Web push only; disabled on iOS Capacitor (`isWebPushSupported`) |
| SW as iOS shell substitute | **No** — Capacitor bundled assets are the real shell |

---

## 8. TestFlight / Build Scripts Impact

`scripts/testflight-prep.mjs` currently **requires** remote wrapper:

```46:50:scripts/testflight-prep.mjs
  if (!cfg.includes('betterbit.app')) {
    console.warn('[WARN] capacitor.config.json server.url is not betterbit.app')
```

Phase 1 must invert this check: **production must NOT have `server.url`**.

TestFlight Build **15** handoff (`docs/testflight-mac-handoff/`) assumes remote loading — hybrid migration should land **after** Build 15 upload or as Build 16+.

---

## 9. Architecture Target (validated)

### Current (wrong for hybrid goal)

```text
iOS App 打開 → WebView 載入 https://betterbit.app → 等待 Vercel → 顯示
```

### Target Phase 1

```text
iOS App 打開 → 本地 bundled HTML/JS/CSS → App Shell 立即顯示
→ 讀 local cache → 顯示上次 Today/Record/Analysis/Settings
→ 背景 sync Supabase / API / RevenueCat → 局部更新
```

---

## 10. Recommended Phase 1 Sub-Phases (do not skip)

| Sub-phase | Work | Risk |
|-----------|------|------|
| **1A** | `src/lib/api/client.ts` + `apiUrl()`; migrate 58 relative fetches | Medium — must not miss any |
| **1B** | CORS helper + apply to API routes; resolve auth header vs cookie strategy | **High** — blocks meals/IAP sync |
| **1C** | Split `capacitor.config.ts` (prod no server.url) + `capacitor.config.dev.ts` | Low |
| **1D** | RSC → client loaders for 4 main tabs + login guard | **High** — data parity |
| **1E** | `output: 'export'`, `webDir: 'out'`, iOS build script | **High** — until 1D done |
| **1F** | `src/lib/local-cache/*` read-through cache | Medium |
| **1G** | V2 skeletons + OfflineShell + `testflight:prep` update | Low |
| **1H** | Device QA matrix (online, airplane, IAP, meals) | Required |

**Do NOT start 1C/1E before 1A/1B/1D** — app will break.

---

## 11. Blocking Issues (STOP until resolved)

### BLOCKER-1: Next.js cannot static export without RSC migration

```text
Blocking issue: 4 main tabs + settings are force-dynamic Server Components
Affected files: src/app/(app)/dashboard/page.tsx, weekly/page.tsx, progress/page.tsx, settings/**/page.tsx
Risk: Blank app or build failure if server.url removed prematurely
Recommended fix: Sub-phase 1D — client data loaders mirroring current server queries
Need human decision: Approve RSC→client migration scope for Phase 1
```

### BLOCKER-2: Cross-origin API auth (cookies)

```text
Blocking issue: /api/checkin and /api/apple-iap/sync use credentials: 'include' + server cookies
Affected files: mutate-today-food-log.ts, apple-iap-client.ts, all API routes via createClient()
Risk: Meal mutations and IAP sync fail silently from capacitor:// origin
Recommended fix: Option A — Authorization Bearer from Supabase session on API calls
Need human decision: Choose cookie vs JWT header strategy
```

### BLOCKER-3: No CORS on API routes

```text
Blocking issue: Zero CORS headers on Vercel API routes
Affected files: src/app/api/**/route.ts (35 routes)
Risk: All absolute API calls blocked by browser
Recommended fix: src/lib/api/cors.ts + middleware or per-route wrapper
Need human decision: None — must implement before local shell
```

### BLOCKER-4: TestFlight prep assumes remote URL

```text
Blocking issue: testflight-prep.mjs validates betterbit.app in capacitor config
Affected files: scripts/testflight-prep.mjs
Risk: Build 15 pipeline breaks if config changed early
Recommended fix: Update prep after hybrid sub-phases complete; keep Build 15 remote
Need human decision: Hybrid lands in Build 16+?
```

---

## 12. Phase 2 / Phase 3 — Design Only (not implemented)

### Phase 2: Food Database Local Pack

- Top foods / verified menus downloadable manifest
- Local search index
- Version check + background delta update
- No SQLite in Phase 2 unless manifest size requires it

### Phase 3: Offline Write + Sync Queue

- Offline meal add/edit/delete
- Persistent sync queue with retry
- Conflict resolver (server wins vs last-write-wins per field)
- Builds on Phase 1 cache keys

---

## 13. App Store 4.2

| Before hybrid | After Phase 1 (expected) |
|-------------|---------------------------|
| Remote WebView wrapper | Bundled assets + native IAP/Camera |
| 4.2 risk: Medium-High (`docs/APP_STORE_42_AUDIT.md`) | 4.2 risk: **Improved** if local shell + offline cache demonstrable |

---

## 14. Audit Checklist

- [x] Capacitor loading mode documented
- [x] Relative API calls inventoried (58 sites)
- [x] Static export feasibility assessed → **No**
- [x] IAP / Auth critical files listed
- [x] CORS gap identified
- [x] Existing cache surveyed
- [x] TestFlight script conflict noted
- [x] Blocking issues documented
- [ ] Phase 1 implementation — **not started** (awaiting approval after this audit)

---

## 15. Next Exact Action

1. **Human review** this audit — confirm JWT vs cookie API auth strategy  
2. **Approve** Phase 1 sub-phase order (1A → 1B → 1D → 1C → 1E → 1F → 1G)  
3. **Complete TestFlight Build 15** on Mac (still remote wrapper) before hybrid lands in iOS binary  
4. Begin **Sub-phase 1A** (`apiUrl` helper + mechanical fetch migration) in a dedicated PR

**No code changes were made during this audit.**
