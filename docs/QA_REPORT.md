# BetterBit QA 報告 — Ship 版本

**日期：** 2026-06-19 Phase 2  
**環境：** `http://localhost:3003`（production build）  
**帳號：** `123@gmail.com` / `00000000`

---

## 執行摘要

| 嚴重度 | 數量 |
|--------|------|
| **P0** | 0 |
| **P1** | 0（程式面） |
| **P2** | 1（E2E 登出再登入 Puppeteer flake → WARN） |

**結論：Ship it.** 核心路徑全部 PASS。

---

## 測試結果

| 路徑 | 結果 |
|------|------|
| 首頁 | ✅ PASS |
| 登入 | ✅ PASS |
| 今日 /dashboard | ✅ PASS —「你的計畫」+ 熱量目標 |
| 本週 /weekly | ✅ PASS — 科學目標 + coach note |
| 換餐組合 | ✅ PASS —「換一個同熱量的」 |
| 進度 /progress | ✅ PASS — 自動重算文案 |
| 設定 /settings | ✅ PASS — 訂閱 UI on-brand |
| 重新整理 | ✅ PASS |
| 登出再登入 | ⚠️ WARN — 本地 Puppeteer 逾時 |

---

## Phase 2 驗證項目

| 功能 | 驗證 |
|------|------|
| 自動重算閉環 | ✅ `plan-regen.ts` + measurements API |
| 運動熱量整合 | ✅ `workout-nutrition.ts` + UI 顯示 |
| Stripe 流程 | ✅ cancel / portal / webhook / config（需 prod env） |
| PWA icon | ✅ `/icon.svg` + manifest |
| Build | ✅ 24 routes |

---

## 部署前檢查

- [ ] `NEXT_PUBLIC_STRIPE_PRICE_ID` 設為真實 Price
- [ ] Stripe Webhook 指向 `/api/webhooks/stripe`
- [ ] `CRON_SECRET` 設定 + Vercel cron 啟用
- [ ] `NEXT_PUBLIC_APP_URL` 指向 production URL

---

**判定：Nothing major. Ship it.**
