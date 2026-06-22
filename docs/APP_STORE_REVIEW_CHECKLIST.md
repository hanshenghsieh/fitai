# BetterBit App Store 審核清單（Reviewer 視角）

**審核日期：** 2026-06-18  
**審核對象：** BetterBit（再健一點）· Capacitor iOS 殼 · `https://betterbit.app`  
**Bundle ID：** `app.fitai.betterbit`  
**審核基準：** [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)（2026）

> **本文件只做審核，不修改程式。**  
> 以下以 **Apple App Review 審核員** 身份，依目前 codebase 與上線狀態做**嚴格**評估。

---

## Executive Verdict

| 項目 | 判定 |
|------|------|
| **現狀能否直接送審** | **❌ 高機率拒審** |
| **最大阻擋項** | Stripe 訂閱（未用 Apple IAP）＋ Apple Health 假連線 |
| **合規已到位** | 刪除帳號、Privacy/Terms/Support URL、相機權限描述 |
| **送審前最低門檻** | 隱藏 Health placeholder ＋ iOS 改 IAP **或** 暫時移除 App 內付費入口 |

**預估結果：** 若維持現狀送審，**90%+ 機率**收到 **Guideline 3.1.1** 或 **2.1 App Completeness** 拒審。

---

## 1. 哪些地方可能被拒審

### 🔴 P0 — 幾乎必拒

| # | 條款 | 問題 | 審核員會看到什麼 |
|---|------|------|------------------|
| R1 | **3.1.1 In-App Purchase** | App 內數位訂閱走 **Stripe Checkout**（`create-subscription` → 跳 `checkout.stripe.com`） | 設定 →「加入會員」→ 離開 App 到 Stripe 付款解鎖功能 |
| R2 | **2.1 App Completeness** | **Apple Health 假連線**：按「連接 Apple Health」→ toast「已連接」，但 `fetchPassiveHealth()` 永遠 `return null`，無 HealthKit entitlement | 功能宣稱同步步數／睡眠，實際零資料 |
| R3 | **2.1 / 5.1.1** | 訂閱按鈕顯示 **「會員準備中」**（Stripe Price ID 未設定時 disabled） | 半成品、無法完成核心購買流程 |
| R4 | **3.1.2 Subscriptions** | 訂閱頁**缺少 Apple 要求的完整自動續訂披露**（見第 6 節） | 價格有，但 auto-renew、取消方式、Terms 連結不完整 |

### 🟠 P1 — 高風險

| # | 條款 | 問題 |
|---|------|------|
| R5 | **4.2 Minimum Functionality** | Capacitor WebView 載入遠端 Next.js；若審核員認定「僅包裝網站」可能拒審（需 Review Notes 說明原生價值：相機、推播、未來 HealthKit） |
| R6 | **2.3.3 Accurate Metadata** | 商店文案若寫「Apple Health 同步」「7 天試用」，與 App 實際（Health 未實作、code 為 **14 天** `TRIAL_DAYS`）不一致 |
| R7 | **1.4.1 Physical Harm** | 健康／飲食建議 App；免責僅設定頁一行＋法律頁，** onboarding 無強制確認** — 嚴格審核員可能要求更顯眼免責 |
| R8 | **3.1.1** | 試用到期 **UpgradeGate** 直接導向「訂閱 NT$500/月」→ Stripe — 與 R1 同類 |
| R9 | **5.1.1(v)** | 刪除帳號已有 ✅；但審核員會實測 — 需確保 Supabase 後端穩定、刪除後無法再登入 |

### 🟡 P2 — 中低風險（仍可能收到訊息）

| # | 條款 | 問題 |
|---|------|------|
| R10 | **2.1** | `inbody-sync` API 為 **mock 假資料** — 目前 UI 未暴露，若未來加 INBODY 連接按鈕會立即成 P0 |
| R11 | **5.1.2** | 食物拍照上傳 Anthropic AI — Privacy Nutrition Labels 須正確申報（照片、健康相關資料） |
| R12 | **4.0 Design** | 品牌混用「再健一點 / BetterBit / fitai.app support email」 — 不拒審但可能要求澄清 |
| R13 | **2.5.4** | WebView 載入遠端 URL — 離線時幾乎全不可用（僅 `capacitor-www` 佔位） |

---

## 2. 哪些按鈕不能出現（送審 build）

審核員會逐頁點擊。以下按鈕／狀態 **不應出現在送審版本**：

| 按鈕／文案 | 位置 | 原因 |
|------------|------|------|
| **「連接 Apple Health」** | 設定 → 健康資料 | 假功能（R2） |
| **「已連接」**（Health 區塊） | 同上 | 誤導 — 無任何資料同步 |
| **「會員準備中」** | 設定／Premium | 半成品（R3） |
| **「訂閱準備中」** | SubscriptionManager | 同上 |
| **「加入會員」「繼續一起走走」「前往付款…」** | 若仍跳 **Stripe** | 違反 3.1.1（R1）— 除非改 IAP |
| **「管理會員與帳單」「管理帳單」** | 若開 **Stripe Billing Portal** | 外部管理訂閱 — iOS 數位訂閱應走 Apple |
| **「訂閱 NT$500/月」** | UpgradeGate | 導向 Stripe 路徑（R8） |
| **任何 disabled 且無說明的付費 CTA** | Premium / Settings | 2.1 不完整 |

### 可以保留的按鈕

| 按鈕 | 條件 |
|------|------|
| 「刪除帳號」 | ✅ 必須保留（5.1.1v） |
| 隱私權政策／服務條款連結 | ✅ 必須可點且可開 |
| 登出 | ✅ |
| 試用期內功能（不強制付費） | ✅ 若試用機制清楚 |

---

## 3. 哪些功能需要隱藏（送審前）

| 功能 | 現況 | 建議 | 優先級 |
|------|------|------|--------|
| **Apple Health 整區** | `SettingsHealthSection` 可見可點 | **整段隱藏** | **P0 必須** |
| **HealthSyncCard** | 元件存在，目前**未**掛在 SettingsScreen | 確保送審 build **不出現** | P0 |
| **Stripe 訂閱流程** | Premium / Settings / UpgradeGate | **二選一：** 改 IAP **或** 暫時隱藏所有付費 CTA | **P0** |
| **Stripe Billing Portal** | `billing-portal` API | iOS 送審版隱藏 | P0 |
| **INBODY 同步** | API mock，UI 未暴露 | 維持不可見；勿在 Review 期加 UI | P2 |
| **試用到期 hard lock** | UpgradeGate blur + 訂閱 | 若無 IAP，審核員無法「購買解鎖」→ 需在 Review Notes 提供 sandbox 或暫時放寬 | P1 |

---

## 4. Apple Health placeholder 是否要先關掉？

### 結論：**是，必須先關掉（P0）**

**審核員實測路徑：**
```
設定 → 健康資料 → Apple Health →「連接 Apple Health」
→ toast「已連接」→ 顯示「已連接」勾選
→ 步數／睡眠：無任何數字
```

**違反指南：**
- **2.1** — 功能不完整／誤導
- **5.1.1** — 健康資料宣稱與實際不符
- 若未申報 **HealthKit entitlement** 卻出現 Health 入口 — 額外紅旗

**`health-sync.ts` 現況：**
```typescript
// Native bridge placeholder — replace when Capacitor / HealthKit wired
return null
```

**`SettingsHealthSection` 問題：**
- 文案：「步數與睡眠會**自動同步**」— 不實
- 按 Connect 後 `setConnected(true)` + toast「**已連接**」— **審核員會視為 bug 或欺騙**

**HealthSyncCard**（若將來掛載）：
- toast：「Apple Health / Health Connect 連線**即將開放**」— 比 Settings 誠實，但仍不應在送審版出現未完成入口

**送審策略：**
1. **現在：** 隱藏整個 Health 區塊  
2. **HealthKit 真正完成後：** 再加 entitlement + 隱私披露 + 重新送審  

---

## 5. Stripe 是否會造成拒審？

### 結論：**會，在 iOS App 內幾乎必然（P0）**

**Apple Guideline 3.1.1：**
> Apps offering digital services/content consumed in the app must use in-app purchase.

BetterBit 訂閱解鎖的是：
- 週計畫生成
- 進度分析
- 試用到期後的功能

→ 全部屬 **App 內數位服務**，**必須 Apple IAP**。

**目前 Stripe 路徑（審核員一定會測）：**
```
/settings/premium 或 /settings
→「加入會員」
→ POST /api/create-subscription
→ redirect checkout.stripe.com
```

**常見拒審信原文：**
> We found that your app includes payment mechanisms other than in-app purchase for digital content.

**例外不適用：**
| 例外 | 是否適用 |
|------|----------|
| Reader App（報紙／雜誌） | ❌ |
| 實體商品 | ❌ |
| 點對點服務（Uber） | ❌ |
| US/EU External Link Entitlement | ⚠️ 台灣區、且需特定 entitlement；不能替代 IAP 解鎖 App 功能 |
| Web 版 Stripe（Safari 另開） | ⚠️ **App 內**仍不可引導購買數位訂閱繞過 IAP |

**Web 繼續用 Stripe：** 可以，但 **iOS App 內不可有購買按鈕跳 Stripe**。

**capacitor.config.ts` allowNavigation` 含 `*.stripe.com`：** 等於主動允許 WebView 開 Stripe — 審核員更會抓到。

---

## 6. 訂閱頁需要哪些文字

### 若使用 Apple IAP（送審正途）

訂閱頁 **必須** 包含（Guideline **3.1.2** + Schedule 2）：

| # | 必填內容 | BetterBit 現況 |
|---|----------|----------------|
| 1 | **訂閱名稱**（e.g. BetterBit 會員月訂） | ⚠️ 有「BetterBit 會員」但非 IAP 商品名 |
| 2 | **訂閱長度**（1 month） | ❌ 未明寫「每月自動續訂」 |
| 3 | **價格**（NT$500/月，含稅說明） | ⚠️ 有「NT$500/月」「約每月五百」 |
| 4 | **自動續訂聲明** | ❌ 缺少標準句 |
| 5 | **如何取消** | ❌ 缺少「設定 → Apple ID → 訂閱」 |
| 6 | **試用條款**（若有 free trial） | ⚠️ 有 14 天試用邏輯，頁面未完整披露 |
| 7 | **Privacy Policy 連結** | ❌ Premium 頁無直接連結 |
| 8 | **Terms of Use 連結** | ❌ Premium 頁無直接連結 |
| 9 | **Restore Purchases 按鈕** | ❌ 不存在 |

### 建議訂閱頁必備文案（繁中，IAP 版）

```
BetterBit 會員（月訂閱）

NT$500 / 月，自動續訂，直到您於 App Store 取消為止。

試用期結束後，若未取消，將自動向您的 Apple ID 收費。
您可隨時在「設定 → Apple ID → 訂閱」管理或取消。

訂閱即表示同意《服務條款》與《隱私權政策》。
再健一點提供生活參考，不是醫療建議。

[訂閱]  [恢復購買]

《服務條款》  《隱私權政策》
```

### 現有 Stripe 頁面額外問題

| 文案 | 問題 |
|------|------|
| 「會員不是解鎖什麼」 | 審核員可能認為迴避訂閱本質 — 需清楚說明付費解鎖什麼 |
| 「約每月五百」 | IAP 須顯示 **精確** App Store 定價，不可用「約」 |
| 「管理帳單」→ Stripe Portal | iOS 不應出現 |

---

## 7. 是否需要 Restore Purchase？

### 結論：**若 App 內有 IAP — 必須（P0）**

Guideline **3.1.1**：
> Apps must include a restore mechanism for restorable in-app purchases.

| 情境 | Restore 按鈕 |
|------|-------------|
| 已實作 Apple IAP | **✅ 必須** — 顯眼位置（訂閱頁） |
| 僅 Stripe、無 IAP | 技術上無 Restore — 但 **Stripe 本身就不該在 iOS 賣訂閱** |
| 完全免費 App | 不需要 |

**現況：** 無 IAP → 無 Restore → **與 Stripe 訂閱組合 = 不可送審**

**實作 Restore 時還需：**
- StoreKit 2 / RevenueCat 收據驗證
- 與 Supabase `subscriptions` 同步
- Review Notes 提供 Sandbox 測試帳號

---

## 8. 是否需要 Sign in with Apple？

### 結論：**目前不需要；加第三方登入後必須（P0）**

Guideline **4.8 Sign in with Apple：**
> Required when app uses third-party login (Google, Facebook, etc.)

**BetterBit 現況：**
- 僅 **Email + 密碼**（Supabase Auth）
- 無 Google / Facebook / LINE Login

→ **不強制** Sign in with Apple。

| 動作 | Sign in with Apple |
|------|-------------------|
| 維持 Email only | ❌ 不需要 |
| 新增 Google 登入 | ✅ **必須同時提供** |
| 只用 Apple 登入 | 可，但需實作 |

**建議（P1，非阻擋）：** 仍建議加入 Sign in with Apple — 提升轉換、降低審核疑慮、符合 iOS 用戶預期。

---

## 9. 醫療免責是否足夠？

### 結論：**勉強不足 — 嚴格審核下為 P1 風險**

**現有免責位置：**

| 位置 | 內容 |
|------|------|
| 設定 → 隱私 →「健康參考」 | 「BetterBit 提供生活參考，不是醫療建議。不舒服先休息。」 |
| `/privacy` | 健康免責段落 |
| `/terms` | 非醫療服務專節 |

**Apple Guideline 1.4.1（Physical Harm）：**
- 提供健康／醫療**資訊**的 App 需清楚免責
- 不能暗示取代醫師／診斷／治療
- 減肥、體脂、熱量、運動處方 → **Health & Fitness 審核會較嚴**

**不足之處：**

| 缺口 | 風險 |
|------|------|
| Onboarding **無**免責確認 | 審核員認為使用者未被告知 |
| Today／計畫頁 **無**常駐免責 | 健康建議直接展示 |
| AI 食物辨識 **無**準確度免責 | 1.4.1 + 2.1 |
| App Store 描述若寫「計算」「處方」 | 2.3.3 夸大 |

**審核員可接受的最低標準（建議）：**
1. Onboarding 最後一步或首次進 Dashboard 前 — **一次**免責確認  
2. 設定／關於 — 保留現有文案  
3. `/terms` + `/privacy` — 已有 ✅  
4. App Store Description — 含「非醫療建議」句  
5. **不要**使用「治療」「診斷」「處方」「保證減重 X 公斤」

**現有 `/privacy` 健康免責 — 法律頁層級 ✅ 足夠；App 內 UX 層級 ⚠️ 不足。**

---

## 10. 其他審核員必查項目

### ✅ 已通過

| 項目 | 狀態 |
|------|------|
| 刪除帳號 | 設定 → 危險區域 → `/api/delete-account` |
| Privacy Policy URL | https://betterbit.app/privacy |
| Terms URL | https://betterbit.app/terms |
| Support URL | https://betterbit.app/support |
| 相機／相簿權限描述 | `Info.plist` 已有繁中說明 |
| ITSAppUsesNonExemptEncryption | `false` ✅ |
| 帳號註冊 | Email 可完成 |

### ⚠️ 待確認（非 code 審核）

| 項目 | 說明 |
|------|------|
| App Privacy 問卷 | 須申報：Email、健康、照片、使用資料 |
| 年齡分級 | Health & Fitness 問卷如实填 |
| Review Notes 測試帳 | 必提供可登入帳密 |
| IAP Sandbox | 若改 IAP，需 Sandbox 購買測試 |

---

## 11. 送審前 Checklist（Reviewer 模擬）

### 必須全勾（P0）

- [ ] **Apple Health 區塊已完全隱藏**
- [ ] **App 內無 Stripe 購買／管理帳單按鈕** — 或已改 **Apple IAP**
- [ ] **Restore Purchases** 已實作（若有 IAP）
- [ ] 訂閱頁含：**價格、期間、自動續訂、取消方式、Terms、Privacy、Restore**
- [ ] 無「準備中」disabled 按鈕
- [ ] Review Notes 含測試帳號 + 操作路徑
- [ ] 商店描述與 App 功能一致（試用天數、Health、IAP）
- [ ] 刪除帳號實測通過

### 強烈建議（P1）

- [ ] Onboarding 或首次使用加**醫療免責**確認
- [ ] AI 食物辨識加「估算僅供參考」提示
- [ ] Sign in with Apple（可選但加分）
- [ ] 統一試用天數文案（code 為 **14 天**）
- [ ] Premium 頁加 Terms / Privacy 連結

### 可之後補（P2）

- [ ] App Preview 影片
- [ ] HealthKit 真正整合後再開 Health 入口
- [ ] INBODY 正式 API
- [ ] 英文本地化

---

## 12. 建議送審策略（兩條路）

### 路線 A — 正規上架（推薦）

```
1. 隱藏 Apple Health
2. 實作 Apple IAP + Restore
3. iOS 移除 Stripe CTA
4. 補齊訂閱頁法律文案
5. 加 onboarding 免責
6. TestFlight → 送審
```

### 路線 B — 先 TestFlight 封測（不送 App Store 審核）

```
維持 Stripe + 隱藏 Health
→ 僅 Internal TestFlight
→ 不可作為 App Store 正式版
```

**不建議：** 帶 Stripe 訂閱 + Apple Health 假連線直接送 App Store 審核。

---

## 13. Review Notes 模板（送審時貼上）

```
BetterBit is a health & fitness companion for Traditional Chinese users.

Test account:
Email: [YOUR_DEMO_EMAIL]
Password: [YOUR_DEMO_PASSWORD]

Notes:
1. Subscription uses Apple In-App Purchase [OR: Subscription is not available in this build — free trial only].
2. Apple Health integration is NOT included in this version.
3. Account deletion: Settings → 危險區域 → 刪除帳號.
4. Privacy: https://betterbit.app/privacy
5. Food photo uses camera only for meal logging; AI estimates are for reference only, not medical advice.
6. The app uses a Capacitor shell loading https://betterbit.app for full SSR/API functionality.

Thank you.
```

---

## 相關文件

- [`APP_STORE_CHECKLIST.md`](./APP_STORE_CHECKLIST.md)
- [`APP_STORE_ASSETS.md`](./APP_STORE_ASSETS.md)
- [`APP_STORE_METADATA.md`](./APP_STORE_METADATA.md)
- [`APP_STORE_SCREENSHOT_GUIDE.md`](./APP_STORE_SCREENSHOT_GUIDE.md)
- [`APPLE_IOS_SETUP.md`](./APPLE_IOS_SETUP.md)

---

**審核結論：** BetterBit **產品深度足夠**，但 **iOS 商業化與 Health placeholder 現狀不符合 App Store 審核標準**。先處理 **Stripe → IAP** 與 **關閉 Apple Health 入口**，再送審。
