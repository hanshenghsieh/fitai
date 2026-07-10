# Windows 端已完成狀態（2026-07-10）

## Git

| 項目 | 值 |
|------|-----|
| Remote | `https://github.com/hanshenghsieh/fitai.git` |
| Branch | `main` |
| 最新相關 commit | `d082c2b` — Visual V2 (Settings, Record, Analysis, Support) + Build 14 bump |
| 前幾筆 | `d3ed294` IAP configure fix Build 13 · `8b782cf` RevenueCat native plugin |

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
| CURRENT_PROJECT_VERSION | **14** |
| Bundle ID | app.fitai.betterbit |

Build 14 關鍵變更：

- Visual V2：設定 / 記錄 / 分析 / 支援頁面
- Settings picker overlay 修復（portal + 隱藏 Bottom Nav）
- IAP 仍沿用 Build 13：`PurchasesPlugin`、In-App Purchase capability、RevenueCat

Build 13：IAP 原生插件修復。Build 12 問題：訂閱卡在「連接付款…」40 秒逾時。

---

## RevenueCat（Dashboard 已設）

- Product：`betterbit_pro_monthly`
- Entitlement：**BetterBit Pro**
- Offering：`default` → Monthly → `betterbit_pro_monthly`

---

## Mac 任務

1. `git pull` + `npm run testflight:prep`
2. Archive + Upload **Build 14**（ASC 已有 14 則用 15）
3. 回報 Ready to Test 後，用戶 iPhone 裝新 Build 測 Sandbox 訂閱

---

## Mac 不需要做的事

- Vercel redeploy（Windows 已完成）
- RevenueCat Dashboard 改設定（已完成）
