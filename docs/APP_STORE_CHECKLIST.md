# BetterBit App Store 準備清單

**建立日期：** 2026-06-18  
**檢查基準 commit：** `4dbc201` — Fix meal log sync, menu plausibility, and today UX improvements.  
**Production：** https://fitai-taupe-sigma.vercel.app  
**GitHub：** https://github.com/hanshenghsieh/fitai

---

## 基礎設施檢查結果（2026-06-18）

| 項目 | 狀態 | 說明 |
|------|------|------|
| GitHub | ✅ 正常 | Repo 可存取；`main` 與 `origin/main` 同步 |
| 最近一次 push | ✅ | `4dbc201` · 2026-06-22 23:13:18 +0800 |
| Branch 狀態 | ✅ 乾淨 | `main` · working tree clean · 無未提交變更 |
| Supabase | ✅ 正常 | 本地 env 已設定；`user_profiles` 查詢可達 |
| Vercel | ✅ 正常 | 首頁 / 註冊 200；API 可回應；本地 `npm run build` 通過 |
| App Store 準備 | ❌ 未就緒 | Web 產品可封測；尚缺 iOS 原生殼與 Apple 合規項 |

### 詳細紀錄

**Git**
```
Branch:  main (4dbc201)
Remote:  origin/main — up to date
Remote:  https://github.com/hanshenghsieh/fitai.git
Recent:  4dbc201 meal log sync + menu plausibility
         f473117 dice menu plausibility + free-text food logging
         7114836 Today button handlers instant UX
```

**Supabase**
- `.env.local` 已設定：`NEXT_PUBLIC_SUPABASE_URL`、`ANON_KEY`、`SERVICE_ROLE_KEY`
- 匿名 key 對 `user_profiles` head 查詢：reachable
- ⚠️ 無法從 repo 直接驗證 Vercel Production 環境變數是否完整；需在 Vercel Dashboard 人工確認

**Vercel**
- `/` → 200（落地頁）
- `/register` → 200
- `/dashboard` → 未登入導向登入（預期行為）
- `/api/get-subscription` → 401（未登入，預期行為）
- Cron 已設定：`weekly-regen`、`send-scheduled-notifications`（`vercel.json`）
- 本地 build：通過

**產品現況（Web）**
- 核心循環已打通：註冊 → 3 步 onboarding → 今日紀錄 → 本週計畫 → 進度 → 訂閱
- 訂閱：Stripe Checkout（Web），非 Apple IAP
- 平台：Next.js PWA，**無** `ios/`、Capacitor、Expo 原生專案
- 圖示：僅 `public/icon.svg`，無 App Store 所需 PNG 尺寸
- 法律頁：無 `/privacy`、`/terms` 公開頁面
- 帳號：有登出，**無** App 內刪除帳號
- Apple Health：設定頁有入口，`health-sync.ts` 為 placeholder

---

## 結論：是否已具備 App Store 準備條件？

**否。** 目前狀態適合 **Web 封測 / TestFlight 前期準備**，尚不足以直接提交 App Store 審核。

主要缺口不在「再多一個 dashboard 功能」，而在：
1. iOS 原生 App 二進位（.ipa）
2. Apple IAP 訂閱與還原購買
3. 帳號刪除 + 隱私權政策 URL
4. 未完成功能的審核風險（Apple Health 等）

---

## P0 — 阻擋上架（必做）

> 沒有這些，無法提交或極高機率被拒。

### P0-1 · Apple Developer 帳號與 App Store Connect
- [ ] 註冊 Apple Developer Program（$99/年）
- [ ] 建立 App 記錄（Bundle ID、SKU、Primary Language）
- [ ] 決定 App Store 顯示名稱：**BetterBit** vs **再健一點**（目前 UI 混用，需統一對外品牌）
- [ ] 設定 App 類別：Health & Fitness
- [ ] 填寫 App Privacy（Privacy Nutrition Labels）

### P0-2 · iOS 原生 App 殼
- [ ] 選定方案：Capacitor（建議，可包現有 Next.js）或 Expo / React Native 重寫
- [ ] 建立 `ios/` 專案並可本機 build `.ipa`
- [ ] 設定 App Icon（1024×1024 PNG）及 iOS 各尺寸 icon set
- [ ] 設定 Launch Screen / Splash
- [ ] 設定 `Info.plist`：相機、相簿權限描述（拍照記錄食物）
- [ ] 設定 Associated Domains / Universal Links（若需 deep link 回 Web）
- [ ] TestFlight 內測 build 可安裝

### P0-3 · 訂閱：Apple IAP
- [ ] App Store Connect 建立訂閱商品（對應現有 NT$500/月方案）
- [ ] 整合 StoreKit 2 或 RevenueCat
- [ ] App 內購買流程（不可在 iOS App 內直接跳 Stripe Checkout 購買數位訂閱）
- [ ] **還原購買**（Restore Purchases）按鈕
- [ ] 訂閱狀態與 Supabase `subscriptions` 表同步
- [ ] 7 天試用：改用 App Store 試用機制或審核可接受的替代方案
- [ ] 審核備註說明 Web 既有 Stripe 用戶如何處理（若適用）

### P0-4 · 帳號刪除（Apple 強制要求）
- [ ] 設定頁新增「刪除帳號」入口
- [ ] 後端 API：刪除 Supabase Auth 用戶 + 關聯資料（profiles、checkins、food logs、subscriptions）
- [ ] 刪除前確認對話框 + 不可逆提示
- [ ] 刪除完成後登出並導回 landing

### P0-5 · 法律與支援頁面（公開 URL）
- [ ] `/privacy` — 隱私權政策（繁中，含資料收集、Supabase、Stripe、Firebase、AI 食物辨識）
- [ ] `/terms` — 服務條款
- [ ] 健康免責聲明（非醫療建議；設定頁已有簡述，需正式頁面）
- [ ] 支援聯絡方式：`support@fitai.app`（已有 mailto，需確認信箱有效）
- [ ] App Store Connect 填入 Privacy Policy URL

### P0-6 · App Store 素材
- [ ] 6.7" / 6.5" / 5.5" 截圖（繁中）
- [ ] App 描述、副標、關鍵字（繁中）
- [ ] 1024×1024 App Store Icon（PNG，無 alpha）
- [ ] 年齡分級問卷
- [ ] 出口合規、加密聲明

### P0-7 · 審核前移除或完成半成品
- [ ] **Apple Health 連接** — 目前為 placeholder（`src/lib/health-sync.ts`）；審核前二選一：**完成 HealthKit 整合** 或 **隱藏入口**
- [ ] 訂閱按鈕不可顯示「會員準備中」（Stripe Price ID 未設定時）；Production 需確認已配置

---

## P1 — 審核高風險 / 強烈建議（上架前）

> 不做可能過審，但拒審或客訴風險高。

### P1-1 · Sign in with Apple
- [ ] 目前僅 email/密碼；若 App 內有其他第三方登入，Apple 要求同時提供
- [ ] 建議 v1 即加入 Sign in with Apple（提升轉換、降低審核疑慮）

### P1-2 · 推播通知（原生）
- [ ] 現有 FCM Web Push 在 iOS PWA 受限
- [ ] iOS App 需 APNs + Firebase Admin 或原生推播
- [ ] 確認 Vercel Production 已設定 `FIREBASE_ADMIN_SDK`、`CRON_SECRET`

### P1-3 · 真人交叉測試
- [ ] 依 [`APP_STORE_500_CROSS_TEST.md`](./market-reality-lab-500/APP_STORE_500_CROSS_TEST.md) 逐項勾選
- [ ] 真機測試：iPhone Safari + TestFlight build
- [ ] 核心流程：註冊 → onboarding → 骰子/拍照/文字記錄 → 刪除紀錄 → 本週計畫 → 訂閱/試用到期

### P1-4 · 生產環境設定驗證
- [ ] Vercel Production env：Supabase、Stripe、CRON、Firebase 全部 set
- [ ] `NEXT_PUBLIC_APP_URL` 指向 production domain
- [ ] Stripe Webhook 指向 production `/api/webhooks/stripe`
- [ ] Supabase Auth redirect URLs 含 production domain

### P1-5 · 品牌與命名一致性
- [ ] App Store 名稱、App 內顯示、support email domain 統一
- [ ] 現況：`再健一點`（layout/manifest）+ `BetterBit`（設定/會員）+ `fitai.app`（support domain）

### P1-6 · 訂閱與付費牆 UX
- [ ] 試用到期文案優化（MR500 仍列為 Top 負評）
- [ ] IAP 價格顯示符合 App Store 規範（含自動續訂說明）
- [ ] 管理訂閱：連至 App Store 訂閱管理或 App 內入口

---

## P2 — 上架後差異化 / 非阻擋（v1.1+）

> 提升留存與口碑，不影響首次過審。

### P2-1 · Apple Health / HealthKit
- [ ] 步數、睡眠、活動能量同步
- [ ] HealthKit entitlement + 隱私披露更新
- [ ] 強化 sleep_debt 偵測（`health-sync.ts` 已預留）

### P2-2 · INBODY 整合
- [ ] 目前 API 為 mock / 選填 Claude 解析
- [ ] 正式 INBODY API 或維持手動輸入

### P2-3 · 產品體驗優化
- [ ] Onboarding 再精簡（模擬仍列 217 次「太長」抱怨；現已 3 步）
- [ ] 訓練影片完整覆蓋
- [ ] Widget / Live Activity（iOS 16+）

### P2-4 · 成長與營運
- [ ] App Store 評價引導（適當時機）
- [ ] TestFlight 封測 → 公開上架漸進 rollout
- [ ] 監控：Sentry / analytics for iOS crashes

---

## 建議執行順序

```
Week 1–2   P0-1 Developer 帳號 + P0-5 法律頁 + P0-4 刪除帳號（Web 可先完成）
Week 2–3   P0-2 Capacitor 包裝 + TestFlight
Week 3–4   P0-3 Apple IAP + P0-7 隱藏/完成 Health
Week 4–5   P0-6 素材 + P1-3 真機測試 → 提交審核
上架後     P2 HealthKit、推播、INBODY
```

---

## 參考文件

| 文件 | 用途 |
|------|------|
| [`APP_STATUS.md`](../APP_STATUS.md) | Web 產品完成度 (~85%) |
| [`APP_STORE_500_CROSS_TEST.md`](./market-reality-lab-500/APP_STORE_500_CROSS_TEST.md) | 500 人模擬 + 真人測試清單 |
| [`.env.example`](../.env.example) | 必要環境變數 |
| [`vercel.json`](../vercel.json) | Production cron 設定 |

---

## 檢查清單摘要

| 優先級 | 項目數 | 狀態 |
|--------|--------|------|
| **P0** | 7 大項 | ❌ 未開始 |
| **P1** | 6 大項 | 🟡 部分基礎設施已就緒 |
| **P2** | 4 大項 | ⏸ 上架後 |

**整體判定：基礎設施（Git / Supabase / Vercel）就緒；App Store 上架準備尚未開始。**
