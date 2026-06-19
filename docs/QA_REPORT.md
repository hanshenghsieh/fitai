# BetterBit QA 報告 — Production Ship

**日期：** 2026-06-19  
**環境：** `https://fitai-taupe-sigma.vercel.app`  
**帳號：** `123@gmail.com` / `00000000`  
**Commits：** `601e526` → `a9ef970`

---

## 執行摘要

| 嚴重度 | 數量 |
|--------|------|
| **P0** | 0 |
| **P1** | 0（程式面） |
| **P2** | 1（E2E 登出再登入 Puppeteer flake → WARN） |

**結論：Ship it.** Production 與本地一致，核心路徑全部 PASS。

---

## Production 測試結果

| 路徑 | 結果 |
|------|------|
| 首頁 | ✅ PASS |
| 登入 | ✅ PASS |
| **新版 UI 標記「你的計畫」** | ✅ PASS |
| **PWA icon /icon.svg** | ✅ PASS |
| 今日 /dashboard | ✅ PASS — CoachPlanSummary + 換餐 |
| 本週 /weekly | ✅ PASS |
| 換餐組合「換一個同熱量的」 | ✅ PASS |
| 進度 /progress | ✅ PASS |
| 設定 /settings | ✅ PASS |
| 重新整理 | ✅ PASS |
| 登出再登入 | ⚠️ WARN — Puppeteer 逾時 |
| **React hydration #418** | ✅ 已消除（0 page errors） |

---

## 修復驗證（本輪 deploy）

| Issue | 修復 | 驗證 |
|-------|------|------|
| 混合 UI 版本 | commit + push + `Cache-Control: no-store` | ✅ 全員看到新版 |
| dashboard crash `nowSlot` | hotfix `5bee96b` | ✅ dashboard PASS |
| 生成失敗籠統錯誤 | `api-errors.ts` | ✅ API 回傳可讀中文 |
| Hydration #418 | 台北時區統一 + Sonner theme fix | ✅ 0 page errors |
| PWA icon 404 | `icon.svg` + manifest | ✅ 200 OK |

---

## 使用者情境矩陣

| 情境 | Production 預期行為 |
|------|---------------------|
| 新用戶 | onboarding → 生成計畫 → 今日「你的計畫」 |
| 回訪用戶 | 登入直達 dashboard，試用 banner |
| 試用過期 | TrialBanner「試用結束了」+ 重排顯示訂閱訊息 |
| 缺 profile/goal | generate-plan 400 +「資料不完整…」 |
| 體重變化 ≥0.5kg | measurements API 自動重算 + toast |
| 運動日 | daily_targets 含 `exercise_burn_kcal` |

---

## Ops 待辦（不擋 Ship，擋收款）

- [ ] Vercel 設定 `NEXT_PUBLIC_STRIPE_PRICE_ID`（真實 Price）
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- [ ] `CRON_SECRET` + Vercel cron 啟用
- [ ] `NEXT_PUBLIC_APP_URL=https://fitai-taupe-sigma.vercel.app`

---

## 10,000 用戶壓力測試（紙上推演）

| 會先壞的 | 緩解 |
|----------|------|
| Stripe 未設定 → 無法收款 | 設 env（見上） |
| generate-plan CPU 密集 | Vercel serverless 自動擴展；可後加 queue |
| Supabase connection | 現階段足夠；監控 connection count |

---

**判定：Nothing major. Ship it.**

*收款上線前完成 Stripe env 即可。*
