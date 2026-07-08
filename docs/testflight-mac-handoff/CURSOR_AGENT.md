# Mac Cursor Agent 任务书

> 复制给用户看的唯一指令：**「你幫我搞定上 TESTFLIGHT 的東西，照 `docs/testflight-mac-handoff/` 做。」**

---

## 你的目标

把 BetterBit iOS App **Archive 并上传到 App Store Connect TestFlight**，Build 号 **11**（若 ASC 已有 11 则用 12）。

成功标准：

- App Store Connect TestFlight 出现新 Build，状态 **Ready to Test**
- 真机可安装，打开后加载 `https://betterbit.app`
- **设定 → 会员 → 订阅** 能弹出 Apple Sandbox 付款画面（不再无限「處理中」）

---

## 前置条件（Mac 必须有）

- [ ] macOS + **Xcode**（含 Command Line Tools）
- [ ] **Apple Developer** 帐号，Team 能签名 `app.fitai.betterbit`
- [ ] **Node.js 18+** 和 npm
- [ ] 网络可访问 GitHub、npm、App Store Connect

---

## 自动执行流程

### Step 1 — 拉最新代码

```bash
git clone https://github.com/hanshenghsieh/fitai.git fitness-app
cd fitness-app
git checkout main
git pull origin main
git log -1 --oneline
```

预期最新 commit 含：`Include RevenueCat native plugin in iOS shell` 或之后。

### Step 2 — 安装依赖

```bash
npm ci
```

若无 `.env.local` 不影响 Archive（App 加载远程 betterbit.app）。

### Step 3 — Prep（必跑）

```bash
npm run testflight:prep
```

这会：

1. 检查 iOS `CURRENT_PROJECT_VERSION = 11`
2. 跑 `npm test`
3. 跑 `npm run build`
4. 跑 `npx cap sync ios`

**验证 RevenueCat 已 sync 进 iOS：**

```bash
grep -i Revenuecat ios/App/CapApp-SPM/Package.swift
```

必须看到 `RevenuecatPurchasesCapacitor`。没有则 `npx cap sync ios` 再跑一次。

### Step 4 — 检查 Build 号冲突

```bash
grep CURRENT_PROJECT_VERSION ios/App/App.xcodeproj/project.pbxproj | head -2
```

若 App Store Connect 已有 Build 11，把 `project.pbxproj` 里两处 `CURRENT_PROJECT_VERSION` 改成 **12**，并改 `scripts/testflight-prep.mjs` 的 `EXPECTED_BUILD`，再 commit（可选）或直接本地 Archive。

### Step 5 — Xcode 设定

```bash
open ios/App/App.xcodeproj
```

在 Xcode：

1. Target **App** → **Signing & Capabilities**
   - Team：选开发者 Team
   - Bundle Identifier：`app.fitai.betterbit`
   - 加 **In-App Purchase** capability（若没有）
2. **General** → Version `1.0`，Build `11`（或 12）
3. 顶部设备选 **Any iOS Device (arm64)**

### Step 6 — Archive

**方式 A — 脚本：**

```bash
bash scripts/testflight-archive-mac.sh
open build/BetterBit-Build11.xcarchive
```

**方式 B — Xcode GUI：**

Product → **Archive** → Organizer 打开后 **Distribute App** → **App Store Connect** → **Upload**

### Step 7 — 回报用户

上传成功后告诉用户：

- Build 号（11 或 12）
- App Store Connect 链接
- 预计 Processing 时间（5–30 分钟）
- 请 iPhone TestFlight 更新后按 `POST_UPLOAD_VERIFY.md` 测订阅

---

## 不要做的事

- ❌ 不要在 Mac 上改 Vercel env（Windows / Vercel Dashboard 已设）
- ❌ 不要改 `capacitor.config.ts` 的 server.url（保持 betterbit.app）
- ❌ 不要用 Sandbox API key 替换 RevenueCat **Public** `appl_` key
- ❌ 不要 force push main

---

## 若 Archive 失败

见 [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)，常见：

- Signing / Provisioning profile
- 缺 In-App Purchase capability
- `npm test` 失败 → 修 test 或报告 blocker
- Build 号与 ASC 重复 → bump build number

---

## 相关路径

```
ios/App/App.xcodeproj          Xcode 专案
ios/App/CapApp-SPM/Package.swift   Capacitor plugins（含 RevenueCat）
scripts/testflight-prep.mjs    prep 脚本
scripts/testflight-archive-mac.sh  Archive 脚本
capacitor.config.ts            remote URL = betterbit.app
src/lib/apple-iap-client.ts    IAP 购买逻辑
```
