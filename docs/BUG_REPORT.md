# BetterBit Bug Report — Production Hardening

**Last updated:** 2026-06-19  
**Status:** Fixed in deploy batch (pending production verification)

---

## Resolved (this release)

### BUG-001 — Mixed UI versions across users
- **Severity:** P0
- **Root cause:** Phase 1+2 work never committed/pushed; production stuck on `aa0b314` while local had months of changes. Some users may have cached old JS bundles.
- **Fix:** Full commit + push + deploy. Added `Cache-Control: no-store` on HTML routes in `next.config.ts`.
- **Verify:** All users see「你的計畫」on `/dashboard` after deploy.

### BUG-002 — Generic「生成失敗，請稍後再試」
- **Severity:** P1
- **Root cause:** `handleRegenPlan` / `GeneratePlanButton` swallowed API error body; 403 trial expiry looked like server failure.
- **Fix:** `src/lib/api-errors.ts` — parses 400/403/500 with Chinese UX copy. `generate-plan` returns `MISSING_PROFILE` / `MISSING_GOAL` codes.
- **Verify:** Trial-expired user sees「試用期已結束，請訂閱以繼續」; incomplete profile sees「資料不完整…」.

### BUG-003 — React hydration error #418
- **Severity:** P1
- **Root cause:** (1) `sonner.tsx` used `useTheme` without `ThemeProvider`. (2) `currentMealSlot()` in `useState` initializer — server UTC vs client local time. (3) `CoachPlanSummary` formatted date on client during SSR pass.
- **Fix:** Hardcode Sonner `theme="light"`. Defer meal slot to `useEffect`. Pass `todayLabel` from server dashboard page.
- **Verify:** Production E2E reports zero `Page errors`.

### BUG-003 — React hydration error #418
- **Status:** ✅ Fixed (`a9ef970`)
- **Fix:** Asia/Taipei timezone for meal slot + character messages; Sonner without `useTheme`; `suppressHydrationWarning` on html/body.

### BUG-004 — PWA icon 404
- **Status:** ✅ Fixed — `/icon.svg` returns 200 on production.

### BUG-007 — Dashboard crash `nowSlot is not defined`
- **Status:** ✅ Fixed (`5bee96b`) — hotfix deployed before timezone patch.

---

## Open / Requires Ops

### BUG-005 — Stripe placeholder price in production
- **Severity:** P1 (revenue)
- **Status:** Code ready; needs `NEXT_PUBLIC_STRIPE_PRICE_ID` in Vercel env.
- **Mitigation:** `SubscriptionManager` shows「訂閱功能準備中」when unset.

### BUG-006 — E2E logout flake
- **Severity:** P2
- **Status:** WARN only; Puppeteer timeout on re-login.

---

## Chaos test matrix (post-deploy)

| Scenario | Expected |
|----------|----------|
| Trial expired + 重排本週 | Toast: 試用期已結束 |
| Missing goal + generate | Toast: 請先設定目標 |
| Reload during generation | Status banner or empty state, no crash |
| Deploy while user online | Hard refresh gets new bundle (no-store HTML) |
| Safari PWA | Icon loads, no white screen |
