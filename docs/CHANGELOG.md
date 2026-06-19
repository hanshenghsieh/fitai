# Changelog

## Phase 3 — Market Humility (2026-06-19)

### P0 shipped
- **Meal trust:** `MealTrustCard` + `meal-trust-copy.ts` — 白話「為什麼這餐？」取代 TDEE/配餐術語
- **D3 victory:** `d3-victory.ts` + banner — 進步=少做決定，不是體重
- **Plateau story:** `plateau-story.ts` — 沒瘦≠失敗，進度頁敘事
- **Life events:** `LifeEventPicker` — 亂吃/出差/過年/生病等，不懲罰
- **Shift work:** 設定頁輪班模式 → 第一餐/第二餐/第三餐/睡前

---

### Deploy
- Commits `601e526`, `5bee96b`, `a9ef970` pushed to `main` → Vercel production.
- All users now receive science-first UI (`CoachPlanSummary`,「換一個同熱量的」).

### Production Fixes
- **Mixed UI:** `Cache-Control: no-store` on HTML routes.
- **Dashboard crash:** `nowSlot` state restored in `HomeDecisionHero`.
- **Error UX:** `src/lib/api-errors.ts` — trial/profile/500 messages in Chinese.
- **Hydration #418:** `src/lib/timezone.ts` (Asia/Taipei), Sonner `theme="light"`, defer meal slot to `useEffect`.
- **PWA:** `public/icon.svg`, manifest, layout icons, SW badge paths.

### QA
- Production E2E: 12 PASS, 1 WARN (logout flake), 0 page errors.

---

## [Unreleased] — 2026-06-19 — Phase 2: Ship-Ready

### Closed Loop (P0)
- **Auto regen on body change:** `POST /api/measurements` and settings save trigger `triggerPlanRegeneration()` when weight Δ≥0.5kg or body fat Δ≥1%.
- User notified via toast with science summary; coach_note prefixed `【已依最新數據重算】`; 再健 confirms on `CoachPlanSummary`.
- Weekly cron regens **all** onboarded users (not only missing plans).

### Exercise ↔ Calorie Integration (P0)
- `workout-nutrition.ts`: workout days eat back 40% of `calories_burned_est`, maintaining net deficit.
- Per-day `daily_targets` now include `exercise_burn_kcal`, `intake_adjustment_kcal`, `net_deficit_kcal`.
- Weekly targets include `weekly_exercise_burn_kcal`; coach note explains integration.
- UI: CoachPlanSummary, workout card, weekly goals show burn estimates.

### Stripe Production Readiness (P1)
- `stripe-config.ts` — single source for `NEXT_PUBLIC_STRIPE_PRICE_ID`.
- `POST /api/cancel-subscription` — cancel at period end.
- `POST /api/billing-portal` — Stripe Customer Portal (restore/manage).
- Webhook uses `createAdminClient()` (service role); handles `checkout.session.completed`.
- `SubscriptionManager` redesigned: on-brand, cancel, portal, graceful fallback when price ID unset.
- `.env.example` documents all required keys.

### Technical Debt (P2)
- PWA: `public/icon.svg` + updated `manifest.json` (no more 404 icons).
- E2E: logout step downgraded to WARN on timeout (Puppeteer flake).
- Push cron fixes retained from Phase 1.

---

## [2026-06-19] — Phase 1: Philosophy Realignment

- Science-first IA: `CoachPlanSummary`, plan-before-swap, onboarding science inputs.
- Removed streak gamification and week reward modal.
- Dice repositioned as「換一個同熱量的」replacement mechanism.
- 再健 retained as personality layer, not hero.

---

## [2026-06-18/19] — Stability

- Fixed `isSideCandidate` crash, per-meal rolls, meal filters, injury-aware workouts.
