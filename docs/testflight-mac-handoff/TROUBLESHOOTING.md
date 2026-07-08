# 常见问题

## 订阅卡在「處理中」、没有 Apple 付款画面

**原因：** TestFlight Build **没有** RevenueCat native plugin（Build ≤10）。

**解决：** 上传 **Build 11+**，确认：

```bash
grep Revenuecat ios/App/CapApp-SPM/Package.swift
```

---

## Archive 失败：Signing

- Xcode → Target App → Signing → 选正确 Team
- 确认 Apple Developer 帐号有效
- Bundle ID `app.fitai.betterbit` 在 Developer Portal 存在

---

## Archive 失败：Build 号重复

App Store Connect 已有 Build 11 → 改 `project.pbxproj` 两处 `CURRENT_PROJECT_VERSION = 12`，再 Archive。

---

## `npm run testflight:prep` 失败

- `npm test` 失败 → 看哪个 test，修或报告
- `npm run build` 失败 → 看 Next.js 错误
- Build number 不匹配 → 改 `scripts/testflight-prep.mjs` 的 `EXPECTED_BUILD` 或改 pbxproj

---

## 找不到 Sandbox 设定（iOS 18+）

路径：**设定 → 开发人员 → Sandbox Apple 帐户**

或先点 App 内订阅，在弹窗登 Sandbox。

---

## 用 Sandbox email 登 App 登入页

❌ 错误。Sandbox 只用于 Apple 付款，App 登入用 BetterBit 注册的 Email。

---

## RevenueCat Product「Could not check」

通常仍可 Sandbox 测试。确认 ASC 有 `betterbit_pro_monthly`、RC Offering 已绑。

---

## 会员页「订阅准备中」

Vercel 缺 IAP env 或未 deploy。Windows 已设 — 确认 betterbit.app 已 Ready。

---

## 永久会员仍显示试用结束

betterbit.app 已修（commit 65d9575）。杀 App 重开再试「帮我排本週」。

---

## In-App Purchase capability

Xcode → Target App → Signing & Capabilities → **+ Capability** → **In-App Purchase**

---

## TestFlight 加载旧网页

Capacitor 加载 `https://betterbit.app`。确认 Vercel Production 是最新 deploy，iPhone 杀 App 重开。
