# TestFlight UX Fix 001

**Date:** 2026-06-18  
**Scope:** iOS Capacitor WebView shell / UI only — no product logic, API, or database changes.

---

## Issues Addressed

| # | Issue | Fix summary |
|---|--------|-------------|
| 1 | Double-tap / pinch zoom; page scales and cannot reset | Viewport lock + CSS `touch-action` + gesture block + native WKWebView zoom limits |
| 2 | Login / register / onboarding overscroll shows black | Canvas background on `html`/`body`, `overscroll-behavior`, `auth-page-shell` with safe-area |
| 3 | 「更多記錄」sheet too tall; keyboard + zoom on open | `max-height: min(80dvh, 80vh)`, internal scroll, safe-area footer, no auto-focus on iOS, 16px input |

---

## Modified Files

### Web / Next.js

| File | Change |
|------|--------|
| `src/app/layout.tsx` | `maximumScale: 1`, `userScalable: false`, `viewportFit: cover`; import shell CSS |
| `src/styles/capacitor-ios-shell.css` | **New** — zoom, overscroll, auth shell, bottom sheet utilities |
| `src/lib/capacitor-ios-shell.ts` | **New** — iOS viewport meta, canvas bg, block pinch gestures |
| `src/components/capacitor/CapacitorShell.tsx` | Install iOS shell on native launch |
| `src/app/login/page.tsx` | `auth-page-shell` wrapper |
| `src/app/register/page.tsx` | `auth-page-shell` wrapper |
| `src/app/onboarding/page.tsx` | `auth-page-shell` wrapper |
| `src/app/(app)/layout.tsx` | `min-h-[100dvh]`, `overscroll-none`, app bg |
| `src/components/dashboard/today/TodayFoodMore.tsx` | Sheet height cap, scroll, safe-area, skip iOS autofocus, 16px search input |
| `src/components/dashboard/today/PhotoLogSheet.tsx` | Same sheet shell pattern (80vh cap, safe footer) |
| `capacitor-www/index.html` | Offline shell viewport: `maximum-scale=1`, `user-scalable=no` |

### iOS native (Capacitor shell)

| File | Change |
|------|--------|
| `ios/App/App/BridgeViewController.swift` | **New** — WKWebView canvas `#F4F2EE`, `min/maxZoomScale = 1` |
| `ios/App/App/Base.lproj/Main.storyboard` | Use `BridgeViewController` instead of `CAPBridgeViewController` |
| `ios/App/App.xcodeproj/project.pbxproj` | Add `BridgeViewController.swift` to target |

---

## Verification Checklist (TestFlight)

### Zoom (Issue 1)

- [ ] Double-tap anywhere on dashboard — page does not zoom
- [ ] Pinch gesture — no scale change
- [ ] After focusing inputs, view returns to 1× scale
- [ ] Vertical scroll still works on long pages

### Overscroll (Issue 2)

- [ ] Register page — pull down/up at edges shows `#F4F2EE`, not black
- [ ] Login page — same
- [ ] Onboarding — same; safe-area top/bottom respected

### 更多記錄 sheet (Issue 3)

- [ ] Sheet height ≤ ~80% of screen on iPhone SE / mini
- [ ] Frequent list scrolls inside sheet
- [ ] Bottom「建立紀錄」button visible above home indicator
- [ ] Opening sheet on iOS does **not** auto-open keyboard (tap search to focus)
- [ ] No zoom when focusing search (16px font)

---

## Build Commands Run

```bash
npm run build
npm run cap:sync
```

**Not run:** Archive / TestFlight upload (per request).

---

## Rollback

Revert commits touching files above; in Xcode, restore `CAPBridgeViewController` in `Main.storyboard` if native build fails.
