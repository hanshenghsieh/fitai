# Windows 端已完成状态（2026-07-08）

## Git

| 项目 | 值 |
|------|-----|
| Remote | `https://github.com/hanshenghsieh/fitai.git` |
| Branch | `main` |
| 最新相关 commit | `5357332` — Include RevenueCat native plugin in iOS shell |
| 前一笔 | `65d9575` — Fix permanent premium gate, account cache bleed, IAP hang |

Mac 执行：`git pull origin main`

---

## Vercel Production（已 deploy Ready）

- https://betterbit.app
- https://www.betterbit.app

**IAP 相关 env 已设（Production + Preview）：**

```
NEXT_PUBLIC_APPLE_IAP_ENABLED=true
NEXT_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...（RevenueCat Public key）
NEXT_PUBLIC_APPLE_IAP_PRODUCT_ID=betterbit_pro_monthly
NEXT_PUBLIC_APPLE_IAP_ENTITLEMENT_ID=BetterBit Pro
```

⚠️ Entitlement ID 必须是 **`BetterBit Pro`**（跟 RevenueCat Dashboard Identifier 一致，不是 `premium`）。

---

## iOS Build

| 字段 | 值 |
|------|-----|
| MARKETING_VERSION | 1.0 |
| CURRENT_PROJECT_VERSION | **11** |
| Bundle ID | app.fitai.betterbit |

Build 11 关键变更：`cap sync` 后 `Package.swift` 包含 `@revenuecat/purchases-capacitor`。

旧 Build（≤10）问题：网页显示「订阅」但原生无 RevenueCat → 点击后卡在「處理中」。

---

## RevenueCat（Dashboard 已设）

- App：BetterBit (App Store) / `app.fitai.betterbit`
- Product：`betterbit_pro_monthly`
- Entitlement：**BetterBit Pro**（Identifier）
- Offering：`default` → Monthly package → `betterbit_pro_monthly`
- In-app purchase key + App Store Connect API：已绿勾

Product 可能显示 **Could not check** — Sandbox 仍常可测。

---

## App Store Connect

- 订阅 `betterbit_pro_monthly`：状态 **准备提交**（正常，送审 App 时一起勾）
- Sandbox 测试员：已建（例：`kevinkknn84@gmail.com`）

---

## 已修 Bug（在 betterbit.app，TestFlight 新 Build 后完整生效）

1. 永久会员仍显示「试用期已结束」→ subscription 查询兼容旧 DB schema
2. 换帐号仍看到旧餐点 → logout/login 清 local cache
3. 注册 onboarding 贴边 → 边距微调
4. IAP 订阅卡在處理中 → **需 Build 11+ 含 RevenueCat native plugin**

---

## Mac 不需要在 Windows 做的事

- Vercel redeploy（已完成）
- RevenueCat Dashboard 改设定（已完成）
- Supabase migration（可选，程式已 workaround）
