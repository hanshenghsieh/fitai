# TestFlight 上传勾选清单（Mac）

## A. 开始前

- [ ] Mac 已装 Xcode
- [ ] 已登录 Apple Developer（Xcode → Settings → Accounts）
- [ ] `git pull origin main` 完成
- [ ] `npm ci` 完成

## B. Prep

- [ ] `npm run testflight:prep` 全部通过
- [ ] `grep Revenuecat ios/App/CapApp-SPM/Package.swift` 有结果
- [ ] Build number = **11**（或 ASC 冲突时用 12）

## C. Xcode

- [ ] 打开 `ios/App/App.xcodeproj`
- [ ] Scheme = **App**
- [ ] Destination = **Any iOS Device (arm64)**
- [ ] Signing Team 正确
- [ ] **In-App Purchase** capability 已加
- [ ] Bundle ID = `app.fitai.betterbit`

## D. Archive & Upload

- [ ] Product → Archive 成功
- [ ] Distribute → App Store Connect → Upload 成功
- [ ] 无 signing / entitlement 错误

## E. App Store Connect

- [ ] TestFlight 看到新 Build
- [ ] Processing 完成 → **Ready to Test**
- [ ] Export Compliance 已填（ITSAppUsesNonExemptEncryption = false 通常选 No）

## F. 真机验收（见 POST_UPLOAD_VERIFY.md）

- [ ] TestFlight 安装最新 Build
- [ ] 设定 → 开发人员 → Sandbox 已登入
- [ ] App 注册/登入 → 会员 → 订阅 → **Apple 付款画面出现**
- [ ] 不再无限「處理中」
