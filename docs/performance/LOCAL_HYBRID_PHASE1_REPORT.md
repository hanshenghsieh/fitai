# Local Hybrid Phase 1 — Sub-phase Report (1A + 1B + 1C)

**Branch:** `feature/local-hybrid-build16`  
**Date:** 2026-07-10  
**Build 15:** Untouched on `main` (remote wrapper TestFlight upload in progress)

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

- **1D** RSC → client loaders (Today, Record, Analysis, Settings)
- **1E** Capacitor production local assets (no `server.url`)
- **1F** Local cache abstraction
- **1G** V2 skeletons / OfflineShell / testflight:prep update

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

**1D-1:** Today (`dashboard/page.tsx`) — client loader + session guard, keep server data parity.
