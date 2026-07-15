# 环境与服务对照

## 1. Vercel（Web — 已由 Windows deploy）

Dashboard：https://vercel.com → 专案 **fitai**

| 变量 | Production 值 | 说明 |
|------|---------------|------|
| `NEXT_PUBLIC_APPLE_IAP_ENABLED` | `true` | 开 IAP UI |
| `NEXT_PUBLIC_REVENUECAT_IOS_API_KEY` | `appl_...` | RevenueCat → Apps → Public API Key |
| `NEXT_PUBLIC_APPLE_IAP_PRODUCT_ID` | `betterbit_pro_monthly` | ASC 商品 ID |
| `NEXT_PUBLIC_APPLE_IAP_ENTITLEMENT_ID` | `premium` | 跟 RC Entitlement Identifier 一致；BetterBit Pro 僅為顯示名稱 |
| `REVENUECAT_SECRET_API_KEY` | `sk_...` | Server-only subscriber verification；不可放進 iOS bundle |
| `REVENUECAT_WEBHOOK_AUTHORIZATION` | 自訂高強度值 | 必須與 RevenueCat Webhook Authorization header 完全一致 |

Mac **不用** redeploy，除非改了 env。

---

## 2. RevenueCat

Dashboard：https://app.revenuecat.com

| 项目 | 值 |
|------|-----|
| iOS Public API Key | `appl_` 开头（给 Vercel + SDK） |
| Bundle ID | `app.fitai.betterbit` |
| Product | `betterbit_pro_monthly` |
| Entitlement Identifier | `premium` |
| Current Offering | `default` → Monthly → `betterbit_pro_monthly` |

Integrations → In-app purchase key + App Store Connect API：需绿勾。

Webhook：

- URL：`https://www.betterbit.app/api/webhooks/revenuecat`
- Authorization：使用与 Vercel `REVENUECAT_WEBHOOK_AUTHORIZATION` 完全相同的值
- 发送 production + sandbox lifecycle events
- Server 收到事件后会重新查询 RevenueCat subscriber；不会信任 webhook 内的 transaction/price/receipt

---

## 3. App Store Connect

https://appstoreconnect.apple.com

| 项目 | 值 |
|------|-----|
| Bundle ID | `app.fitai.betterbit` |
| 订阅 Product ID | `betterbit_pro_monthly` |
| 价格 | 约 NT$299/月 |
| Sandbox 测试员 | Users and Access → **Sandbox** → Test Accounts |

---

## 4. Capacitor（iOS 壳）

`capacitor.config.ts`：

- `appId`: `app.fitai.betterbit`
- `server.url`: `https://betterbit.app`（TestFlight 加载远程 web）

TestFlight = 原生壳 + 远程网页。IAP 购买走原生 RevenueCat SDK。

---

## 5. Sandbox 登入位置（iOS 18+）

**不是** App 登入页，**不是** 设定 → App Store（旧路径）。

正确：

```
设定 → 开发人员（Developer）→ 最下面 Sandbox Apple 帐户
```

若没有「开发人员」：

```
设定 → 隐私与安全性 → 开发者模式 → 打开 → 重启
```

或：App 内点订阅 → 弹窗直接输入 Sandbox 帐号。

Sandbox 帐号 ≠ BetterBit App 帐号。
