# 1E-D Mac Local Hybrid Smoke Test

**Branch:** `feature/local-hybrid-build16`  
**Prepared:** 2026-07-10  
**Preview API:** `https://fitai-r567yi5vu-hanshenghsiehs-projects.vercel.app`

> Windows agent prepared `out/` + `cap sync`. **Mac Run required** to complete 1E-D.

---

## Mac setup (run on Mac)

```bash
git checkout feature/local-hybrid-build16
git pull

# If out/ not fresh, rebuild with preview API:
NEXT_PUBLIC_API_BASE_URL=https://fitai-r567yi5vu-hanshenghsiehs-projects.vercel.app npm run ios:local:prep

npm run ios:local:open
# Xcode → select Simulator or device → Run (NOT Archive)
```

---

## Pre-flight checks

```bash
# No server.url in iOS config
cat ios/App/App/capacitor.config.json | grep -E '"url"|webDir'

# Local assets present
ls ios/App/App/public/index.html ios/App/App/public/dashboard.html
```

Expected:
- `webDir`: `out`
- No `"url": "https://..."`
- `public/index.html` exists

---

## Online smoke test checklist

| # | Test | Pass | Fail | Notes |
|---|------|------|------|-------|
| 1 | App launch (no white screen) | ☐ | ☐ | |
| 2 | Login | ☐ | ☐ | |
| 3 | Onboarding redirect | ☐ | ☐ | |
| 4 | Today loads | ☐ | ☐ | |
| 5 | Record loads | ☐ | ☐ | |
| 6 | Record date switch | ☐ | ☐ | |
| 7 | Analysis loads | ☐ | ☐ | |
| 8 | Analysis week switch | ☐ | ☐ | |
| 9 | Settings loads | ☐ | ☐ | |
| 10 | Settings subpages | ☐ | ☐ | |
| 11 | Premium page | ☐ | ☐ | |
| 12 | IAP offerings display | ☐ | ☐ | Sandbox may need device |
| 13 | Restore purchase | ☐ | ☐ | |
| 14 | Meal add | ☐ | ☐ | |
| 15 | Meal edit | ☐ | ☐ | |
| 16 | Meal delete | ☐ | ☐ | |
| 17 | Today/Record sync | ☐ | ☐ | |

---

## Airplane mode checklist

1. Open app online once
2. Force quit app
3. Enable Airplane Mode
4. Reopen app

| # | Test | Pass | Fail | Notes |
|---|------|------|------|-------|
| 1 | No white screen | ☐ | ☐ | |
| 2 | Local shell visible | ☐ | ☐ | |
| 3 | Skeleton / offline OK | ☐ | ☐ | No full data required (1F) |
| 4 | NOT old capacitor-www placeholder | ☐ | ☐ | |
| 5 | NOT Vercel failure page | ☐ | ☐ | |

---

## CORS / API debug

Preview CORS verified (2026-07-10):
- `OPTIONS /api/get-subscription` → 204
- `Access-Control-Allow-Origin: *`

If API errors in Simulator:
- Safari Web Inspector → Network → check `Authorization: Bearer`
- Confirm requests go to `fitai-r567yi5vu-hanshenghsiehs-projects.vercel.app`
- Do NOT revert to cookie / credentials include

---

## Stop conditions

Stop and report if:
- White screen on launch
- `capacitor.config.json` has `server.url`
- App loads betterbit.app as WebView entry
- All API calls 401 (check Supabase session)
- Airplane mode shows old offline placeholder
