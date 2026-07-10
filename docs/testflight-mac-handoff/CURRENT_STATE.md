# Windows 端已完成狀態（2026-07-10）

> Mac Cursor：直接讀 [`CURSOR_AGENT.md`](./CURSOR_AGENT.md) 或貼 [`MAC_ONE_LINER.txt`](./MAC_ONE_LINER.txt)

## Git

| 項目 | 值 |
|------|-----|
| Remote | `https://github.com/hanshenghsieh/fitai.git` |
| Branch | `main` |
| 最新 commit | `d43a61e` — Build 15 handoff，Windows testflight:prep 已驗證 |
| 前幾筆 | `8e319c9` Build 14 · `d082c2b` Visual V2 |

Mac 執行：`git pull origin main`

---

## Vercel Production（已 deploy）

- https://betterbit.app
- Visual V2 已在 `d082c2b`（設定 / 記錄 / 分析 / 支援）

**IAP 相關 env 已設（Production）：**

```
NEXT_PUBLIC_APPLE_IAP_ENABLED=true
NEXT_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...（RevenueCat Public key）
NEXT_PUBLIC_APPLE_IAP_PRODUCT_ID=betterbit_pro_monthly
NEXT_PUBLIC_APPLE_IAP_ENTITLEMENT_ID=BetterBit Pro
NEXT_PUBLIC_APP_STORE_SAFE_MODE=true
```

⚠️ Entitlement ID 必須是 **`BetterBit Pro`**（不是 `premium`）。

---

## iOS Build（Mac 要上傳的目標）

| 欄位 | 值 |
|------|-----|
| MARKETING_VERSION | 1.0 |
| CURRENT_PROJECT_VERSION | **15** |
| Bundle ID | app.fitai.betterbit |

Build 15 關鍵變更：

- Visual V2：設定 / 記錄 / 分析 / 支援頁面
- Settings picker overlay 修復（portal + 隱藏 Bottom Nav）
- IAP 仍沿用 Build 13：`PurchasesPlugin`、In-App Purchase capability、RevenueCat

---

## Windows 已跑過的驗證

```bash
npm run testflight:prep   # test + build + cap:sync，EXPECTED_BUILD=15
```

通過後應看到：

- `[OK] iOS CURRENT_PROJECT_VERSION = 15`
- `[OK] Capacitor server → betterbit.app`
- `[OK] capacitor.config.json includes PurchasesPlugin`
- `npm test` 698 pass · `npm run build` pass · `cap sync ios` pass

Mac **仍須再跑** `npm run testflight:prep`（確保本機 node_modules / cap sync 一致）後再 Archive。

---

## RevenueCat（Dashboard 已設）

- Product：`betterbit_pro_monthly`
- Entitlement：**BetterBit Pro**
- Offering：`default` → Monthly → `betterbit_pro_monthly`

---

## Mac 任務（僅剩）

1. `git pull origin main`
2. `npm ci` → `npm run testflight:prep`
3. Xcode Archive + Upload **Build 15**（ASC 已有 15 才 bump 16）
4. Ready to Test 後回報用戶

---

## Mac 不需要做的事

- ❌ 改 Vercel env / redeploy（Windows 已完成）
- ❌ 改 RevenueCat Dashboard（已完成）
- ❌ bump build 號（Windows 已設 15，除非 ASC 衝突）
- ❌ 改 `capacitor.config.ts` server.url
