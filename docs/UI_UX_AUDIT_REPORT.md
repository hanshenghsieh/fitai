# UI/UX Audit Report — GitHub Standards

Generated: 2026-07-08  
Scope: Main user routes + Capacitor shell  
Standard: WCAG 2.x mobile patterns, 44×44px touch targets, loading/error/empty states, safe areas

---

## Executive Summary

| Category | Before | After this batch |
|----------|--------|------------------|
| Route error boundaries | 0 | **2** (`app/error.tsx`, `(app)/error.tsx`) |
| Offline reconnect sync | Missing | **Implemented** |
| Modal a11y (Escape/focus) | Partial | **AppOverlay improved** |
| Touch targets (close/nav) | ~32px | **44px** on critical controls |
| Safe area (notif/skeleton) | Inconsistent | **Aligned** |

**Verdict:** Core flows meet GitHub mobile UX bar for beta. Remaining items are polish / data / monetization config.

---

## Fixed in This Batch ✅

| ID | Issue | Fix |
|----|-------|-----|
| P0-1 | No route error UI | Added `error.tsx` with retry + 回到今日 |
| P0-2 | Modal no Escape/focus | `AppOverlay.tsx` keydown + focus on open |
| P0-3 | Delete account modal a11y | `role="dialog"`, `aria-labelledby`, safe-area bottom |
| P0-4 | Photo preview empty alt | `alt={draft.name \|\| '食物照片'}` |
| P0-5 | Offline blocker no alert | `role="alert"` + `aria-live` |
| P1-6 | Bottom nav no `aria-current` | Added + `aria-label="主要導覽"` |
| P1-7 | Segment control no toggle semantics | `aria-pressed` + `role="group"` |
| P1-8 | Onboarding progress not exposed | `role="progressbar"` + `aria-valuenow` |
| P1-10 | Photo loading not announced | `aria-live="polite"` on status lines |
| P1-12 | Login missing autocomplete | `email` + `current-password` |
| P1-13 | Sheet close buttons < 44px | `min-h/w-[44px]` on PhotoLog/Record sheets |
| P1-15 | Analytics chevrons < 44px | Expanded hit areas |
| P1-19 | Notification banner no safe-area | `pt-[max(env(safe-area-inset-top),12px)]` |
| P1-21 | Dashboard skeleton layout jump | `app-page-top` on skeleton |
| P1-22 | Failed plan no retry | `GeneratePlanButton` on failed status |
| P1-30 | Weight input iOS zoom | `text-[16px]` |
| P2-31 | Offline banner lied about auto-sync | Reconnect sync implemented |
| P2-33 | Premium Suspense null flash | Skeleton fallback |

---

## Remaining — Manual / Deferred

### Accessibility (P2–P3)

| Issue | Location | Effort |
|-------|----------|--------|
| Charts visual-only | `AnalyticsScreen`, `WeightTrendChart` | Medium — add sr-only summary |
| `userScalable: false` | `layout.tsx` | Product decision |
| Global reduced-motion for spinners | app-wide | Small CSS pass |
| Onboarding silent validation | `onboarding/page.tsx` | Medium |
| Settings logout no confirm | `SettingsAccountSection` | Small |

### Data / Product

| Issue | Owner |
|-------|-------|
| P0 retail 0 verified items | Founder manual ONR entry |
| Dice 96% D-grade placeholders | Backfill sprints |
| Stripe / IAP production keys | Founder env config |

### Architecture (defer)

| Issue | Notes |
|-------|-------|
| Cold-start offline dashboard | Needs client bootstrap from localStorage |
| Design token unification | `colors` → `BB_V2` migration |
| Top overlay z-index policy | Offline + Notification + Sonner coordination doc |

---

## Route Scorecard (Post-Fix)

| Route | UX Grade | Notes |
|-------|----------|-------|
| Dashboard | **A-** | Offline sync, failed retry, skeleton aligned |
| Progress | **B+** | Charts a11y gap |
| Weekly | **B+** | Error prop still unused |
| Settings | **B+** | Delete modal improved |
| Login/Register | **A-** | Autocomplete + focus rings |
| Onboarding | **B** | Progress bar fixed; validation UX pending |
| Landing | **B** | Safe area partial |
| OfflineShell | **A-** | Honest sync states |
| PhotoLogSheet | **A-** | Native camera + a11y loading |

---

## Verification Commands

```bash
npm test
npm run build
npm run lint
```

Mobile: `docs/FOOD_LOG_PERSIST_MOBILE_E2E.md`  
Wake-up: `docs/WAKE_UP_CHECKLIST.md`
