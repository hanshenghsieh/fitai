# Mac Cursor Agent 任務書

> 複製給 Mac Cursor 的指令見 [`MAC_ONE_LINER.txt`](./MAC_ONE_LINER.txt)

---

## 你的目標

把 BetterBit iOS App **Archive 並上傳到 App Store Connect TestFlight**，Build 號 **13**（若 ASC 已有 13 則用 14）。

成功標準：

- App Store Connect TestFlight 出現新 Build，狀態 **Ready to Test**
- 真機可安裝，打開後載入 `https://betterbit.app`
- **設定 → 會員 → 訂閱** 能進入「讀取方案… → 等待 Apple 付款…」並彈出 **Apple Sandbox 付款畫面**（不再卡在「連接付款…」或 40 秒逾時）

---

## 背景（為什麼一定要 Build 13）

Build 12 訂閱卡在「連接付款…」根因：

1. `capacitor.config.json` 的 `packageClassList` 缺 `PurchasesPlugin`（Archive 前沒 cap sync）
2. Xcode 缺 **In-App Purchase** capability

Windows 已修（commit `d3ed294` 或之後）：

- `ios/App/App/capacitor.config.json` 已納入 git（含 `PurchasesPlugin`）
- `project.pbxproj` 已加 In-App Purchase + `CURRENT_PROJECT_VERSION = 13`
- 網頁端 `apple-iap-client.ts` 會用 `Capacitor.isPluginAvailable('Purchases')` 快速失敗，不再空等

**Build 12 無法只靠網頁更新修好，必須重新 Archive 上傳 Build 13。**

---

## 前置條件（Mac 必須有）

- [ ] macOS + **Xcode**（含 Command Line Tools）
- [ ] **Apple Developer** 帳號，Team 能簽名 `app.fitai.betterbit`
- [ ] **Node.js 18+** 和 npm
- [ ] 網路可訪問 GitHub、npm、App Store Connect

---

## 自動執行流程

### Step 1 — 拉最新程式碼

```bash
cd fitness-app   # 若已 clone；否則 git clone https://github.com/hanshenghsieh/fitai.git fitness-app && cd fitness-app
git checkout main
git pull origin main
git log -1 --oneline
```

預期最新 commit 含：`Fix IAP configure hang` 或 `d3ed294` 之後。

### Step 2 — 安裝依賴

```bash
npm ci
```

無 `.env.local` 不影響 Archive（App 載入遠端 betterbit.app）。

### Step 3 — Prep（必跑，不可跳過）

```bash
npm run testflight:prep
```

這會：

1. 檢查 iOS `CURRENT_PROJECT_VERSION = 13`
2. 跑 `npm test`
3. 跑 `npm run build`
4. 跑 `npx cap sync ios`
5. 驗證 `capacitor.config.json` 含 `PurchasesPlugin`

**驗證 RevenueCat 已 sync 進 iOS：**

```bash
grep -i Revenuecat ios/App/CapApp-SPM/Package.swift
grep PurchasesPlugin ios/App/App/capacitor.config.json
```

兩者都必須有輸出。沒有則 `npx cap sync ios` 再跑一次。

### Step 4 — 檢查 Build 號衝突

```bash
grep CURRENT_PROJECT_VERSION ios/App/App.xcodeproj/project.pbxproj | head -2
```

若 App Store Connect **已有 Build 13**：

1. 把 `project.pbxproj` 裡兩處 `CURRENT_PROJECT_VERSION = 13` 改成 **14**
2. 改 `scripts/testflight-prep.mjs` 的 `EXPECTED_BUILD` 為 `'14'`
3. 再跑 `npm run testflight:prep`

### Step 5 — Xcode 設定

```bash
open ios/App/App.xcodeproj
```

在 Xcode：

1. Target **App** → **Signing & Capabilities**
   - Team：選開發者 Team
   - Bundle Identifier：`app.fitai.betterbit`
   - 確認有 **In-App Purchase** capability（repo 已加，若 Xcode 沒顯示請手動 Add Capability）
2. **General** → Version `1.0`，Build `13`（或 14）
3. 頂部設備選 **Any iOS Device (arm64)**

### Step 6 — Archive 並上傳

**方式 A — 腳本：**

```bash
bash scripts/testflight-archive-mac.sh
open build/BetterBit-Build13.xcarchive
```

Organizer → **Distribute App** → **App Store Connect** → **Upload**

**方式 B — Xcode GUI：**

Product → **Archive** → Organizer → **Distribute App** → **App Store Connect** → **Upload**

### Step 7 — 回報用戶

上傳成功後告訴用戶：

- 實際 Build 號（13 或 14）
- App Store Connect 處理狀態
- 預計 Processing 時間（5–30 分鐘）
- iPhone TestFlight 更新後按 [`POST_UPLOAD_VERIFY.md`](./POST_UPLOAD_VERIFY.md) 測訂閱

---

## 不要做的事

- ❌ 不要在 Mac 上改 Vercel env（Windows / Vercel Dashboard 已設）
- ❌ 不要改 `capacitor.config.ts` 的 server.url（保持 betterbit.app）
- ❌ 不要用 Sandbox API key 替換 RevenueCat **Public** `appl_` key
- ❌ 不要跳過 `npm run testflight:prep` 直接 Archive
- ❌ 不要 force push main

---

## 若 Archive 失敗

見 [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)，常見：

- Signing / Provisioning profile
- 缺 In-App Purchase capability
- `npm test` 失敗 → 修 test 或回報 blocker
- Build 號與 ASC 重複 → bump build number

---

## 相關路徑

```
ios/App/App.xcodeproj              Xcode 專案
ios/App/App/capacitor.config.json  含 packageClassList + PurchasesPlugin（已納入 git）
ios/App/CapApp-SPM/Package.swift   Capacitor plugins（含 RevenueCat）
scripts/testflight-prep.mjs        prep 腳本（EXPECTED_BUILD=13）
scripts/testflight-archive-mac.sh  Archive 腳本
capacitor.config.ts                remote URL = betterbit.app
src/lib/apple-iap-client.ts        IAP 購買邏輯
```
