# TestFlight Mac 交接包

> **给 Mac 上的 Cursor：** 用户只会说「你幫我搞定上 TESTFLIGHT 的東西」。  
> **Windows 端已准备好代码并 push 到 `main`。** 你的任务 = 拉代码 → 跑 prep → Archive → Upload → 回报 Build 状态。

---

## 30 秒速览

| 项目 | 值 |
|------|-----|
| Repo | `https://github.com/hanshenghsieh/fitai.git` |
| Branch | `main` |
| Bundle ID | `app.fitai.betterbit` |
| Marketing Version | `1.0` |
| **Build Number（本次应上传）** | **`12`** |
| Web 加载 | `https://betterbit.app`（Capacitor remote） |
| 关键修复 | Build 11 含 **RevenueCat native plugin**（旧 Build 订阅会卡在「處理中」） |

---

## Mac Cursor 执行顺序（照做）

```bash
# 1. 克隆或进入专案
cd ~/fitness-app   # 或 git clone https://github.com/hanshenghsieh/fitai.git
git pull origin main

# 2. 安装依赖（若 node_modules 不存在）
npm ci

# 3. 一键 prep：test + next build + cap sync ios
npm run testflight:prep

# 4. 确认 RevenueCat plugin 已进 iOS（必须看到 purchases-capacitor）
grep -i revenuecat ios/App/CapApp-SPM/Package.swift

# 5. Archive + 上传指引
bash scripts/testflight-archive-mac.sh
# 然后 Xcode Organizer → Distribute App → App Store Connect → Upload
```

**或手动：** `open ios/App/App.xcodeproj` → Any iOS Device → Product → Archive → Upload

---

## 上传前 Xcode 必查（2 分钟）

1. **Signing & Capabilities** → Team 选对 → **In-App Purchase** capability 存在  
2. **General → Identity** → Version `1.0` / Build **`11`**（若 ASC 已有 11，改成 **12** 再上传）  
3. Scheme = **App**，Destination = **Any iOS Device (arm64)**

---

## 上传后

1. [App Store Connect → TestFlight](https://appstoreconnect.apple.com) 等 **Processing → Ready to Test**  
2. iPhone TestFlight 更新到最新 Build  
3. 按 [`POST_UPLOAD_VERIFY.md`](./POST_UPLOAD_VERIFY.md) 验收

---

## 本资料夹文件

| 文件 | 用途 |
|------|------|
| [`CURSOR_AGENT.md`](./CURSOR_AGENT.md) | **Mac Cursor 完整自主任务说明**（最重要） |
| [`CHECKLIST.md`](./CHECKLIST.md) | 逐步勾选清单 |
| [`CURRENT_STATE.md`](./CURRENT_STATE.md) | Windows 已完成什么、最近 commit |
| [`ENV_AND_SERVICES.md`](./ENV_AND_SERVICES.md) | Vercel / RevenueCat / ASC 设定 |
| [`POST_UPLOAD_VERIFY.md`](./POST_UPLOAD_VERIFY.md) | 上传后 Sandbox 订阅测试 |
| [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) | 常见问题 |

---

## 重要：Web vs Native

- **Vercel（betterbit.app）** = 网页逻辑、IAP 按钮、会员页文案 → Windows 已 deploy  
- **TestFlight .ipa** = iOS 壳 + **RevenueCat StoreKit 原生桥** → **必须在 Mac Archive**  
- 只 redeploy Vercel **不能** 修复「订阅卡在處理中」—— 必须新 Build 含 RevenueCat plugin
