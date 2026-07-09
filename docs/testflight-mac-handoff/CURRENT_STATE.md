# Windows 端已完成狀態（2026-07-09）

## Git

| 項目 | 值 |
|------|-----|
| Remote | `https://github.com/hanshenghsieh/fitai.git` |
| Branch | `main` |
| 最新相關 commit | `d3ed294` — Fix IAP configure hang: native plugin check, Build 13, committed capacitor config |
| 前幾筆 | `8b782cf` IAP configure fix · `5357332` RevenueCat native plugin · `65d9575` premium gate / cache bleed |

Mac 執行：`git pull origin main`

---

## Vercel Production（已 deploy）

- https://betterbit.app

**IAP 相關 env 已設（Production）：**

```
NEXT_PUBLIC_APPLE_IAP_ENABLED=true
NEXT_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...（RevenueCat Public key）
NEXT_PUBLIC_APPLE_IAP_PRODUCT_ID=betterbit_pro_monthly
NEXT_PUBLIC_APPLE_IAP_ENTITLEMENT_ID=BetterBit Pro
```

⚠️ Entitlement ID 必須是 **`BetterBit Pro`**（不是 `premium`）。

---

## iOS Build（Mac 要上傳的目標）

| 欄位 | 值 |
|------|-----|
| MARKETING_VERSION | 1.0 |
| CURRENT_PROJECT_VERSION | **13** |
| Bundle ID | app.fitai.betterbit |

Build 13 關鍵變更：

- `ios/App/App/capacitor.config.json` 納入 git，`packageClassList` 含 `PurchasesPlugin`
- `project.pbxproj` 已加 **In-App Purchase** capability
- `Package.swift` 含 `@revenuecat/purchases-capacitor`

Build 12 問題：訂閱卡在「連接付款…」40 秒逾時 → 原生 Purchases 插件未載入。

---

## RevenueCat（Dashboard 已設）

- Product：`betterbit_pro_monthly`
- Entitlement：**BetterBit Pro**
- Offering：`default` → Monthly → `betterbit_pro_monthly`

---

## Mac 任務

1. `git pull` + `npm run testflight:prep`
2. Archive + Upload **Build 13**（ASC 已有 13 則用 14）
3. 回報 Ready to Test 後，用戶 iPhone 裝新 Build 測 Sandbox 訂閱

---

## Mac 不需要做的事

- Vercel redeploy（Windows 已完成）
- RevenueCat Dashboard 改設定（已完成）
