# Mac Cursor 任務書 — Build 16（Local Hybrid）

> **複製給 Mac Cursor 的整段指令**見 [`MAC_BUILD16_ONE_LINER.txt`](./MAC_BUILD16_ONE_LINER.txt)

---

## 目標

把 **Betterbit** iOS App **Archive 並上傳 TestFlight Build 16**。

這是 **local hybrid**（bundled `out/` + preview API），**不是** Build 15 的 remote WebView wrapper（`server.url → betterbit.app`）。

**Windows 端事前工作已完成**：brand 更名、app icon、營養 bug fix、local read-through cache、build 號 16、單元測試通過、分支已 push。

---

## 硬性限制

- ❌ **不要 merge 到 `main`**
- ❌ **不要改 production betterbit.app deploy**（Build 15 用戶仍用 remote wrapper）
- ❌ **不要**在 `capacitor.config` 加 `server.url`（必須 local hybrid）
- ❌ 不要改 bundle id、IAP product id、RevenueCat public key
- ✅ 若有本機小 bug 修復：**先 commit + push** 到 `feature/local-hybrid-build16`，再繼續 prep

---

## Preview API（Build 16 用）

```
https://fitai-r567yi5vu-hanshenghsiehs-projects.vercel.app
```

若此 URL 404 或 CORS 失敗，到 Vercel → `fitai` 專案 → `feature/local-hybrid-build16` 最新 deployment 複製 Preview URL 替換。

---

## Step 0 — 本機修改先上傳（必做）

```bash
cd fitness-app   # 或你的 clone 路徑
git checkout feature/local-hybrid-build16
git status
```

若有已修改的檔案（你之前修的小 bug）：

```bash
git add -A
git commit -m "fix: Mac-side bug fixes for Build 16 local hybrid"
git push origin feature/local-hybrid-build16
```

若 `git status` 乾淨，跳過 commit。

---

## Step 1 — 拉最新

```bash
git pull origin feature/local-hybrid-build16
git log -3 --oneline
```

預期含 `chore: Build 16 prep` 與 `feat: add local read-through cache` 等 commit；`CURRENT_PROJECT_VERSION = 16`。

---

## Step 2 — 依賴

```bash
npm ci
```

---

## Step 3 — Local hybrid prep（必跑）

```bash
export IOS_BUILD_TARGET=local-hybrid
export IOS_BUILD_NUMBER=16
export NEXT_PUBLIC_API_BASE_URL=https://fitai-r567yi5vu-hanshenghsiehs-projects.vercel.app

npm run testflight:prep
```

這會：檢查 build 16 → `npm test` → `build:ios-local` → `cap sync` → 驗證 `webDir=out`、**無** `server.url`、含 `PurchasesPlugin`。

**驗證：**

```bash
grep -E '"webDir"|"url"' ios/App/App/capacitor.config.json
grep PurchasesPlugin ios/App/App/capacitor.config.json
ls ios/App/App/public/index.html
```

預期：`webDir` 為 `out`、沒有遠端 `url`、有 `index.html`。

---

## Step 4 —（建議）Simulator 煙測

完整清單：`docs/performance/LOCAL_HYBRID_1E_D_MAC_SMOKE_TEST.md`

```bash
npm run ios:local:open
```

Xcode → Simulator → **Run**（先不要 Archive）。確認：啟動無白屏、登入、今日/紀錄/分析/設定可載入。

---

## Step 5 — Xcode Archive + Upload

```bash
export IOS_BUILD_TARGET=local-hybrid
export IOS_BUILD_NUMBER=16
export NEXT_PUBLIC_API_BASE_URL=https://fitai-r567yi5vu-hanshenghsiehs-projects.vercel.app

bash scripts/testflight-archive-mac.sh
open build/BetterBit-Build16.xcarchive
```

Organizer → **Distribute App** → **App Store Connect** → **Upload**

Xcode 檢查：
- Target **App** → Signing：Team 正確，`app.fitai.betterbit`，有 **In-App Purchase**
- General → Display Name **Betterbit**，Build **16**
- 裝置選 **Any iOS Device (arm64)**

若 ASC 已存在 Build 16：改 `project.pbxproj` 兩處為 17、`testflight-prep.mjs` EXPECTED_BUILD，重跑 prep 後再 Archive。**回報實際上傳的 build 號。**

---

## Step 6 — 上傳後回報

依 `docs/testflight-mac-handoff/POST_UPLOAD_VERIFY.md`，並額外確認 Build 16：

| 項目 | 預期 |
|------|------|
| 主畫面 App 名稱 | **Betterbit**（不是 BETTERBIT / FitAI） |
| App Icon | 新 icon（非舊 placeholder） |
| 載入方式 | local shell（**不是**整頁 betterbit.app WebView） |
| IAP | Sandbox 付款畫面可彈出 |
| 離線 | 開過一次後飛航模式仍可見 shell（見 1E-D 清單） |

回報：實際 build 號、ASC 處理狀態、煙測 pass/fail、若有 commit 請給 commit hash。

---

## 相關路徑

```
feature/local-hybrid-build16          工作分支
scripts/testflight-prep.mjs           EXPECTED_BUILD=16
scripts/testflight-archive-mac.sh     Archive 腳本
docs/performance/LOCAL_HYBRID_1E_D_MAC_SMOKE_TEST.md
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```
