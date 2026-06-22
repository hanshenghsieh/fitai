# BetterBit iOS 設定指南（Capacitor + Next.js）

**版本：** Capacitor 8 · iOS 原生殼  
**Bundle ID：** `app.fitai.betterbit`  
**App 名稱：** 再健一點  
**Production URL：** https://betterbit.app

---

## 架構說明

BetterBit **保留 Next.js 全端架構**（Vercel SSR + API Routes）。iOS App 是 **Capacitor WebView 殼**，啟動後載入 Production URL，不進行 static export，**不改動任何 Web 功能**。

```
┌─────────────────────────────────┐
│  iOS App (Capacitor / WKWebView) │
│  ios/App/App.xcodeproj           │
└──────────────┬──────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────┐
│  Next.js on Vercel               │
│  betterbit.app    │
│  (dashboard / API / Supabase)    │
└─────────────────────────────────┘
```

---

## 前置需求（MacBook）

| 項目 | 版本建議 |
|------|----------|
| macOS | Ventura 13+ 或 Sonoma / Sequoia |
| Xcode | 15+（含 iOS SDK） |
| Xcode Command Line Tools | `xcode-select --install` |
| Node.js | 20+（與 Web 專案相同） |
| Apple Developer | $99/年（TestFlight / App Store 必備） |
| CocoaPods | Capacitor 8 預設使用 SPM；通常 **不需** CocoaPods |

---

## 第一次設定（MacBook）

### 1. 取得程式碼

```bash
git clone https://github.com/hanshenghsieh/fitai.git
cd fitai
npm install
```

### 2. 同步 iOS 專案

```bash
npm run cap:sync
```

此指令會：
- 複製 `capacitor-www/` 至 `ios/App/App/public/`
- 更新 `ios/App/App/capacitor.config.json`
- 同步 Capacitor plugins（App、SplashScreen、StatusBar）

### 3. 用 Xcode 開啟

```bash
npm run cap:open:ios
```

或手動開啟：

```
ios/App/App.xcodeproj
```

> **注意：** 開啟 `App.xcodeproj`，不是 repo 根目錄。

### 4. Xcode 簽章設定

1. 左側選 **App** target → **Signing & Capabilities**
2. **Team** → 選你的 Apple Developer Team
3. **Bundle Identifier** → 確認為 `app.fitai.betterbit`
4. 若 Team 首次使用此 Bundle ID，Xcode 會自動向 Apple 註冊

### 5. 真機執行（開發）

1. iPhone 以 USB 連接 Mac
2. Xcode 頂部裝置選單 → 選你的 iPhone
3. 第一次需在 iPhone：**設定 → 一般 → VPN 與裝置管理** → 信任開發者
4. 按 **▶ Run**（或 `Cmd + R`）

App 啟動後會載入 Vercel Production，行為與 Safari 開啟相同，但包在原生殼內。

---

## 日常開發流程

### 只改 Web（Next.js）— 最常見

Web 改動 deploy 到 Vercel 後，**iOS 殼無需重 build**（因為載入遠端 URL）。

```bash
# Web 端照常
git push origin main   # → Vercel 自動部署
```

重新開啟 iOS App 即可看到更新。

### 改 iOS 原生設定（Info.plist、Icon、Capabilities）

```bash
# 在 Mac 上
npm run cap:sync          # 同步 capacitor.config.ts
npm run cap:open:ios      # 開 Xcode
# 修改後在 Xcode Build & Run
```

### 本地 Web + iOS 真機除錯

若要在 iOS 上測 **本機** Next.js（同一 Wi‑Fi）：

**Terminal 1 — 啟動 Next.js（監聽所有介面）**

```bash
npm run dev -- --hostname 0.0.0.0
```

**Terminal 2 — 查 Mac 區域 IP**

```bash
ipconfig getifaddr en0
# 例如：192.168.1.42
```

**Terminal 3 — 指向本機並同步**

```bash
CAP_SERVER_URL=http://192.168.1.42:3000 npm run cap:sync
npm run cap:open:ios
```

> 本機 HTTP 需在 `capacitor.config.ts` 已設 `cleartext: true`（使用 `http://` 時自動啟用）。

---

## TestFlight 上架流程

### 1. App Store Connect 建立 App

1. 登入 [App Store Connect](https://appstoreconnect.apple.com)
2. **My Apps → + → New App**
3. 填寫：
   - **Platform：** iOS
   - **Name：** 再健一點（或 BetterBit）
   - **Primary Language：** Chinese (Traditional)
   - **Bundle ID：** `app.fitai.betterbit`
   - **SKU：** `betterbit-ios-001`（自訂唯一值）

### 2. App 圖示（必做）

目前 repo 僅有 `public/icon.svg`。上架前需：

1. 準備 **1024×1024 PNG**（無 alpha 通道）
2. 在 Xcode → **App → Assets.xcassets → AppIcon** 拖入各尺寸
3. 或使用 [appicon.co](https://www.appicon.co) 產生完整 icon set

路徑：`ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### 3. Archive & Upload

1. Xcode → 裝置選 **Any iOS Device (arm64)**
2. **Product → Archive**
3. Archive 完成 → **Distribute App**
4. 選 **App Store Connect → Upload**
5. 依精靈完成（自動簽章、上傳）

### 4. TestFlight

1. App Store Connect → 你的 App → **TestFlight**
2. 等待 Build 處理（通常 5–30 分鐘）
3. 填寫 **Export Compliance**（已在 Info.plist 設 `ITSAppUsesNonExemptEncryption = false`）
4. 加入 **Internal Testing** 測試員（同 Team 成員，立即可測）
5. **External Testing** 需 Beta App Review（首次約 1–2 天）

### 5. App Store 審核必備連結

| 項目 | URL |
|------|-----|
| Privacy Policy | https://betterbit.app/privacy |
| Terms | https://betterbit.app/terms |
| Support | https://betterbit.app/support |

---

## 未來 Apple IAP 準備

目前 Web 訂閱走 **Stripe**。iOS App Store 上架後，App 內數位訂閱需改 **Apple IAP**（尚未實作，此殼已預留擴充點）。

### Xcode 啟用 In-App Purchase

1. Xcode → **App** target → **Signing & Capabilities**
2. **+ Capability** → **In-App Purchase**
3. App Store Connect → **Subscriptions** 建立商品

### 建議整合方案（下一階段）

| 方案 | 說明 |
|------|------|
| **RevenueCat** | 推薦；處理 StoreKit 2、還原購買、收據驗證 |
| **@capacitor-community/in-app-purchases** | Capacitor 原生 plugin |
| **StoreKit 2（Swift）** | 完全自管，工程量大 |

### IAP 實作時需新增（尚未包含）

- [ ] StoreKit / RevenueCat SDK
- [ ] 還原購買按鈕
- [ ] 訂閱狀態同步至 Supabase `subscriptions`
- [ ] App 內隱藏 Stripe Checkout（iOS 審核規範）

`capacitor.config.ts` 已允許 `*.stripe.com` navigation，供過渡期 Web 訂閱；IAP 上線後可移除。

---

## 專案檔案對照

| 路徑 | 用途 |
|------|------|
| `capacitor.config.ts` | Capacitor 主設定（Bundle ID、Production URL） |
| `capacitor-www/index.html` | 離線殼頁（遠端 URL 模式下的佔位） |
| `ios/App/App.xcodeproj` | **Xcode 專案（用這個開）** |
| `ios/App/App/Info.plist` | 權限描述、加密聲明、方向鎖定 |
| `ios/App/App/Assets.xcassets/` | App Icon、Splash |
| `ios/App/App/AppDelegate.swift` | iOS 入口（Capacitor 預設） |
| `docs/APP_STORE_CHECKLIST.md` | 完整 App Store P0 清單 |

---

## npm 指令

| 指令 | 說明 |
|------|------|
| `npm run cap:sync` | 同步 Web 殼與 plugin 至 `ios/` |
| `npm run cap:open:ios` | 用 Xcode 開啟 iOS 專案 |
| `npm run cap:ios` | sync + open（Mac 常用） |

---

## 常見問題

### Windows 上可以 build iOS 嗎？

**不行。** `ios/` 專案可在 Windows 產生並 commit，但 **Archive / TestFlight / 真機 Run 必須在 Mac + Xcode**。

### 為什麼 App 載入的是 Vercel 而不是本機 bundle？

Next.js 使用 SSR 與 API Routes，不適合打包成靜態檔。Capacitor `server.url` 模式是官方支援的 **Hosted Web App** 做法，功能零改動。

### 審核會不會因為「只是 Web 殼」被拒？

Apple 允許 WebView App，但需：
- 提供實質價值（BetterBit 已有完整健康計畫功能）
- 符合 IAP 規範（付費功能需 IAP）
- 提供刪除帳號、隱私政策（已完成）

### 拍照功能在 iOS 上能用嗎？

可以。`Info.plist` 已加入相機／相簿權限描述。Web `<input capture>` 在 WKWebView 內可正常觸發。

### `ios/App/App/public/` 要不要 commit？

**不要。** 已在 `ios/.gitignore` 排除；每次 `cap sync` 會重新產生。

---

## 真機測試能力檢查表

在 Mac 完成以下步驟後，即具備真機測試能力：

- [ ] `npm install` 成功
- [ ] `npm run cap:sync` 成功
- [ ] Xcode 開啟 `ios/App/App.xcodeproj`
- [ ] Signing Team 已設定
- [ ] iPhone 已信任開發者憑證
- [ ] Run 後可看到 Production 登入頁
- [ ] 相機／相簿權限提示正常（設定 → 拍照記錄）

**目前 repo 狀態：** iOS 專案與 Capacitor 設定 **已就緒**；需在 **MacBook + Xcode + Apple Developer** 完成簽章後即可真機 Run 與 TestFlight。

---

## 相關文件

- [Capacitor iOS Workflow](https://capacitorjs.com/docs/ios)
- [Capacitor Config — server.url](https://capacitorjs.com/docs/config#server)
- [TestFlight Beta Testing](https://developer.apple.com/testflight/)
- [`docs/APP_STORE_CHECKLIST.md`](./APP_STORE_CHECKLIST.md)
