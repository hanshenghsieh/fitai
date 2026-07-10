# Mac Cursor Agent 任務書 — Build 15

> 複製給 Mac Cursor 的指令見 [`MAC_ONE_LINER.txt`](./MAC_ONE_LINER.txt)

---

## 你的目標

把 BetterBit iOS App **Archive 並上傳到 App Store Connect TestFlight**，Build 號 **15**。

**Windows 端事前工作已全部完成**（build 號、單元測試、production build、cap sync、文件）。Mac 只需 pull → 再跑 prep → Archive → Upload。

成功標準：

- App Store Connect TestFlight 出現 **Build 15**，狀態 **Ready to Test**
- 真機可安裝，打開後載入 `https://betterbit.app`（含 Visual V2）
- **設定 → 會員 → 訂閱** 能彈出 **Apple Sandbox 付款畫面**（不再 40 秒逾時）

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

預期最新 commit 含 **Build 15** bump 與 handoff 文件更新。

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

1. 檢查 iOS `CURRENT_PROJECT_VERSION = 15`
2. 跑 `npm test`（698 tests）
3. 跑 `npm run build`
4. 跑 `npx cap sync ios`
5. 驗證 `capacitor.config.json` 含 `PurchasesPlugin`

**驗證 RevenueCat 已 sync 進 iOS：**

```bash
grep -i Revenuecat ios/App/CapApp-SPM/Package.swift
grep PurchasesPlugin ios/App/App/capacitor.config.json
```

兩者都必須有輸出。

### Step 4 — Build 號衝突（通常不需要）

Build **15** 已在 repo 設好。**僅當** App Store Connect 已有 Build 15：

1. `project.pbxproj` 兩處 `CURRENT_PROJECT_VERSION = 15` → **16**
2. `scripts/testflight-prep.mjs` 的 `EXPECTED_BUILD` → `'16'`
3. 再跑 `npm run testflight:prep`

### Step 5 — Xcode 設定

```bash
open ios/App/App.xcodeproj
```

在 Xcode：

1. Target **App** → **Signing & Capabilities**
   - Team：選開發者 Team
   - Bundle Identifier：`app.fitai.betterbit`
   - 確認有 **In-App Purchase** capability
2. **General** → Version `1.0`，Build **`15`**
3. 頂部設備選 **Any iOS Device (arm64)**

### Step 6 — Archive 並上傳

**方式 A — 腳本：**

```bash
bash scripts/testflight-archive-mac.sh
open build/BetterBit-Build15.xcarchive
```

Organizer → **Distribute App** → **App Store Connect** → **Upload**

**方式 B — Xcode GUI：**

Product → **Archive** → Organizer → **Distribute App** → **App Store Connect** → **Upload**

### Step 7 — 回報用戶

上傳成功後告訴用戶：

- 實際 Build 號（15 或 16）
- App Store Connect 處理狀態
- 預計 Processing 時間（5–30 分鐘）
- iPhone TestFlight 更新後按 [`POST_UPLOAD_VERIFY.md`](./POST_UPLOAD_VERIFY.md) 測訂閱與 Visual V2

---

## 不要做的事

- ❌ 不要在 Mac 上改 Vercel env（Windows 已設）
- ❌ 不要改 `capacitor.config.ts` 的 server.url（保持 betterbit.app）
- ❌ 不要用 Sandbox API key 替換 RevenueCat **Public** `appl_` key
- ❌ 不要跳過 `npm run testflight:prep` 直接 Archive
- ❌ 不要 force push main
- ❌ 不要無故 bump build 號（Windows 已設 15）

---

## 若 Archive 失敗

見 [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)

---

## 相關路徑

```
ios/App/App.xcodeproj              Xcode 專案
ios/App/App/capacitor.config.json  PurchasesPlugin 已納入 git
ios/App/CapApp-SPM/Package.swift   含 RevenueCat
scripts/testflight-prep.mjs        EXPECTED_BUILD=15
scripts/testflight-archive-mac.sh  Archive 腳本
docs/testflight-mac-handoff/       本交接包
```
