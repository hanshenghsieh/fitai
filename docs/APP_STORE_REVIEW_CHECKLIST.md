# BetterBit App Store 正式審核檢查清單

**Bundle ID：** `app.fitai.betterbit`  
**Production：** https://betterbit.app  
**更新日期：** 2026-07-08  

> 本文件是 **送審閘門**。全部 P0 勾完才能按 Submit for Review。  
> 不做產品新功能；只確認合規與 IAP。

---

## Executive 判決（工程現況）

| 項目 | 狀態 |
|------|------|
| iOS 程式碼阻擋 Stripe Checkout / Billing Portal | ✅ |
| iOS 開啟 `NEXT_PUBLIC_APPLE_IAP_ENABLED=true` 後只走 Apple IAP UI | ✅ |
| Web 仍可走 Stripe | ✅ |
| Apple Health / mock INBODY sync UI | ✅ 已隱藏／503 |
| App Store Connect 訂閱商品 + RevenueCat + Vercel env | ❌ **需你人工完成** |
| 可否立即送正式審核 | ❌ **尚不可**（缺 IAP 後台與 Sandbox 真機驗收） |

---

## P0 門檻（全勾才可送審）

### 付款

- [ ] **iOS App 無 Stripe**：設定／會員／試用到期頁不會跳 `checkout.stripe.com` 或 Billing Portal
- [ ] **Apple IAP 可購買**：Sandbox 帳號可完成月訂 `betterbit_pro_monthly`
- [ ] **Restore Purchase 可用**：換機或重裝後可還原 entitlement
- [ ] **訂閱狀態可恢復**：有效 → `subscriptions.status=active`；過期／取消到期後不再 `hasFullAccess`（試用規則另計）

### 假功能／未完成入口

- [ ] **無 mock Apple Health**：設定頁無「連接 Apple Health」
- [ ] **無 mock INBODY sync**：無 INBODY 連線／同步入口；`/api/inbody-sync` 為 503
- [ ] 無「會員準備中」等半成品主 CTA（IAP env + RevenueCat key 必須已設）

### 法律與帳號

- [ ] Privacy：https://betterbit.app/privacy
- [ ] Terms：https://betterbit.app/terms
- [ ] Support：https://betterbit.app/support
- [ ] Delete Account：設定 → 危險區域 → 刪除帳號可用
- [ ] Demo account：App Store Connect Review Notes 可登入帳密

### 核心飲食流程（審核員會點）

- [ ] 拍照記錄可用
- [ ] 手動／文字新增餐點可用
- [ ] 修改餐點可用
- [ ] **刪除餐點可用** — 刪除後切到「本週」或「我的」再回「今日」，餐點**不可復原**
- [ ] 自動化：`npm run qa:release-gate`（含刪除回歸單元測試；設 `BB_E2E_EMAIL` 則含瀏覽器 E2E）

---

## Vercel Production 環境變數（審核版）

```
NEXT_PUBLIC_APPLE_IAP_ENABLED=true
NEXT_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxx
NEXT_PUBLIC_APPLE_IAP_ENTITLEMENT_ID=premium
NEXT_PUBLIC_APPLE_IAP_PRODUCT_ID=betterbit_pro_monthly
```

建議：**不要**同時依賴 `NEXT_PUBLIC_APP_STORE_SAFE_MODE=true` 當正式付費路徑（那是 pre-IAP 全開）。  
正式審核請用 **IAP enabled**。

Web 可保留 Stripe：

```
NEXT_PUBLIC_STRIPE_PRICE_ID=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

---

## App Store Connect 人工設定（工程之外）

1. App 記錄（Bundle ID `app.fitai.betterbit`）
2. Subscription Group + 自動續訂商品  
   - Product ID：**`betterbit_pro_monthly`**（須與 env 一致）  
   - 價格：台灣約 NT$190／月（年繳 NT$980／年）  
3. Xcode Capability：**In-App Purchase**
4. RevenueCat：iOS app + entitlement `premium` + Current Offering 挂上 package
5. Sandbox 測試員帳號
6. App Privacy Labels、年齡分級、截圖、Review Notes（含 demo 帳號）
7. Archive → TestFlight → 正式 Submit

---

## iPhone 真機手動測試步驟

### A. 帳號

1. **新註冊**：Email 註冊 → Onboarding → 進入今日  
2. **登出再登入**：確認資料還在  

### B. 餐點

3. **新增**：文字或拍照記一筆  
4. **修改**：打開餐點 → 修正份量／儲存  
5. **刪除**：刪除該筆 → 重開 App 確認已消失  

### C. Apple IAP（Sandbox）

6. iPhone：**設定 → App Store → Sandbox 帳號** 登入測試員  
7. App：**設定 → 會員（BetterBit Pro）**  
8. 按 **訂閱 BetterBit Pro** → 完成 Sandbox 購買表  
9. 確認會員解鎖、重開 App 仍為訂閱中  
10. 按 **還原購買** → 應提示已還原／仍為訂閱中  

### D. 帳號刪除

11. **設定 → 危險區域 → 刪除帳號** → 確認無法再用同帳登入（或需重新註冊）  

### E. 負面檢查（付款）

12. 全程不應出現 Stripe 網頁、外部「前往付款」、Billing Portal  
13. 設定頁不應出現 Apple Health「已連接」假狀態  

---

## 相關程式入口

| 行為 | 位置 |
|------|------|
| iOS 擋 Stripe API | `src/lib/ios-payment-gate.ts` + `create-subscription` / `billing-portal` |
| Apple IAP UI | `AppleIapSubscriptionSection.tsx` |
| IAP sync | `src/app/api/apple-iap/sync/route.ts` |
| Premium 路由 | `PremiumScreen.tsx`（IAP → Apple；native 無 IAP → TestFlight 說明；Web → Stripe） |

---

## Review Notes 模板

```
BetterBit (再健一點) — Health & Fitness companion (Traditional Chinese).

Demo account:
Email: [填寫]
Password: [填寫]

Subscriptions: Apple In-App Purchase (RevenueCat). Product ID: betterbit_pro_monthly.
Restore Purchases: Settings → 會員 → 還原購買.

Not included in this build:
- Apple Health / HealthKit sync
- INBODY account sync

Account deletion: Settings → 危險區域 → 刪除帳號
Privacy: https://betterbit.app/privacy
Terms: https://betterbit.app/terms
Support: https://betterbit.app/support

Shell: Capacitor WKWebView loading https://betterbit.app
```
