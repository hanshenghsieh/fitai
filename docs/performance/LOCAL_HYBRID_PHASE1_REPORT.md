# Local Hybrid Phase 1 — Sub-phase Report (1A + 1B + 1C)

**Branch:** `feature/local-hybrid-build16`  
**Date:** 2026-07-10  
**Build 15:** Uploaded to TestFlight (remote wrapper); `main` unchanged by Build 16 branch

---

## Completed

### 1A — API client helper

- `src/lib/api/client.ts` — `apiUrl`, `getSupabaseAccessToken`, `apiFetch`, `apiFetchJson`
- All **58** relative `fetch('/api/...')` in `src/` migrated to `apiFetch`
- Removed `credentials: 'include'` from client API calls
- Default API base: `NEXT_PUBLIC_API_BASE_URL` → `NEXT_PUBLIC_APP_URL` → `https://betterbit.app`

### 1B — Bearer JWT + CORS on API routes

- `src/lib/api/auth.ts` — `requireApiUser` via `supabase.auth.getUser(token)`
- `src/lib/api/cors.ts` — allowlist origins + OPTIONS preflight
- **32** user-facing API routes migrated (cron/webhooks/send-notifications skipped)
- Public routes (`auth/register`, `auth/confirm-email`, `inbody-sync` stub): CORS only

### 1C — High-risk APIs first

| API | Status |
|-----|--------|
| `/api/checkin` | Bearer + CORS |
| `/api/apple-iap/sync` | Bearer + CORS |
| `/api/food-photo` | Bearer + CORS |
| `/api/food-photo/match` | Bearer + CORS |
| `/api/calorie-bank` | Bearer + CORS |
| `/api/measurements` | Bearer + CORS |
| `/api/get-subscription` | Bearer + CORS |
| Settings `/*` | Bearer + CORS |

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `npm test` | PASS (698 tests) |
| `fetch('/api/` remaining in src | **0** |
| Build 15 ios/capacitor files changed | **No** |

---

## Not started (per plan)

- **1E** Capacitor production local assets (no `server.url`)
- **1F** Local cache abstraction
- **1G** V2 skeletons / OfflineShell / testflight:prep update

---

## Sub-phase 1D-1 — Today Client Loader (2026-07-10)

| Item | Status |
|------|--------|
| `src/features/today/useTodayData.ts` | Done |
| `src/features/today/today-data-loader.ts` | Done |
| `src/features/today/TodayPageClient.tsx` | Done |
| `TodayV2Skeleton` / error / refreshing | Done |
| `dashboard/page.tsx` | Client-only, no RSC |
| `GeneratePlanButton` | Uses `apiFetch` + refetch |
| Build / tests | PASS |

### Today RSC blockers

**Before:** `force-dynamic`, `getAppUser`, `headers()`, server Supabase fetch, auto plan gen on server  
**After (page.tsx):** None — pure `'use client'`  
**Remaining:** `generate-plan-action.ts` (orphaned `'use server'`, unused) — safe to remove in cleanup

---

## Known risks

1. **Deploy coupling:** Web + API must deploy together — cookie-only API clients will get 401 until frontend uses `apiFetch` everywhere (done in branch).
2. **Cross-origin from capacitor://** — CORS allowlist ready; full E2E needs Build 16 local shell (1E).
3. **plan-regen** still uses `CRON_SECRET` Bearer to `/api/generate-plan` — unchanged, correct.

---

## Can rollback

Yes — revert branch `feature/local-hybrid-build16`; `main` / Build 15 unaffected.

---

## Next exact action

## Sub-phase 1D-2 — Record Client Loader (2026-07-10)

| Item | Status |
|------|--------|
| `src/features/record/useRecordData.ts` | Done |
| `src/features/record/record-data-loader.ts` | Done |
| `src/features/record/RecordPageClient.tsx` | Done |
| `RecordV2Skeleton` / error / refreshing | Done |
| `weekly/page.tsx` | Client-only, no RSC |
| Date switch (arrows / pill / score cards) | Client-side via hook |
| Meal mutations | Unchanged; `onRefresh` replaces `router.refresh()` |
| Build / tests | PASS (698) |

### Record RSC blockers

**Before:** `force-dynamic`, async `RecordContent`, `getAppUser`, server `loadAnalyticsBundle`  
**After (weekly/page.tsx):** None — pure `'use client'`  
**Remaining:** None in Record route

---

## Sub-phase 1D-3 — Analysis Client Loader (2026-07-10)

| Item | Status |
|------|--------|
| `src/features/analysis/useAnalysisData.ts` | Done |
| `src/features/analysis/analysis-data-loader.ts` | Done |
| `src/features/analysis/AnalysisPageClient.tsx` | Done |
| `AnalysisV2Skeleton` / error / refreshing | Done |
| `progress/page.tsx` | Client-only, no RSC |
| Week switch (prev / next arrows) | Client-side via hook |
| Build / tests | PASS (698) |

### Analysis RSC blockers

**Before:** `force-dynamic`, async `ProgressContent`, `getAppUser`, server `loadAnalyticsBundle` + body measurements  
**After (progress/page.tsx):** None — pure `'use client'`  
**Remaining:** None in Analysis route

---

## Sub-phase 1D-4 — Settings Client Loader (2026-07-10)

| Item | Status |
|------|--------|
| `src/features/settings/useSettingsData.ts` | Done |
| `src/features/settings/settings-data-loader.ts` | Done |
| `src/features/settings/SettingsPageClient.tsx` | Done |
| `SettingsSubpageClient` / `PremiumPageClient` | Done |
| `SettingsV2Skeleton` / error / refreshing | Done |
| `settings/page.tsx` + 12 subpages | Client-only, no RSC |
| Pro card / IAP read-only | Preserved |
| Build / tests | PASS (698) |

### Settings RSC blockers

**Before:** `force-dynamic` on main + 11 subpages; `getAppUser` / `requireSettingsBundle` / server Supabase on main, bundle subpages, premium  
**After:** None in Settings routes — pure `'use client'` shells  
**Remaining:** None in Settings routes

### Settings subpages

| Route | Exists | Client loader |
|-------|--------|---------------|
| `/settings/profile` | Yes | Yes |
| `/settings/goals` | Yes | Yes |
| `/settings/body` | Yes | Yes |
| `/settings/notifications` | Yes | Yes |
| `/settings/photo` | Yes (not `photo-recognition`) | Yes |
| `/settings/diet` | Yes | Yes |
| `/settings/interface` | Yes | Yes |
| `/settings/language` | Yes | Yes |
| `/settings/help` | Yes | Static client (no bundle) |
| `/settings/contact` | Yes | Yes |
| `/settings/about` | Yes | Static client (version only) |
| `/settings/password` | Yes (not `security/password`) | Yes |
| `/settings/premium` | Yes | Yes (`PremiumPageClient`) |
| `/settings/invite` | Yes | Static client (coming soon) |

---

## Sub-phase 1D Final Gate (2026-07-10)

All four primary app pages client-loader complete. Gate **PASS**.

| Page | Client shell | Client loader | Skeleton | Error | Refreshing | RSC blockers | `/api` + credentials |
|------|-------------|---------------|----------|-------|------------|--------------|----------------------|
| Today (`/dashboard`) | Yes | Yes | Yes | Yes | Yes | None in route | 0 |
| Record (`/weekly`) | Yes | Yes | Yes | Yes | Yes | None in route | 0 |
| Analysis (`/progress`) | Yes | Yes | Yes | Yes | Yes | None in route | 0 |
| Settings (`/settings`) | Yes | Yes | Yes | Yes | Yes | None in routes | 0 |

| Gate check | Result |
|------------|--------|
| `npm run build` | PASS |
| `npm test` | PASS (698) |
| `fetch('/api/` in src | **0** |
| `credentials: include` in src | **0** |
| Capacitor / iOS touched | **No** |
| Production deploy | **Not deployed** |

**Orphaned (non-blocking):** `dashboard/generate-plan-action.ts` (`'use server'`, unused) — cleanup phase

---

**Next:** **1E** — Local bundled assets / `output: export` / `server.url` removal feasibility (do not start until explicitly approved)
