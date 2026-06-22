# BetterBit Guideline 4.2 審核報告（Minimum Functionality）

**審核身份：** Apple App Review（Guideline 4.2 — Design / Minimum Functionality）  
**審核日期：** 2026-06-18  
**審核對象：** BetterBit（再健一點）· Bundle ID `app.fitai.betterbit` · Production `https://betterbit.app`  
**審核基準：** [App Store Review Guidelines §4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality)

> **本文件只做審核與策略建議，不修改程式。**  
> 以下分析基於目前 repo 與已上線 Safe Mode（`NEXT_PUBLIC_APP_STORE_SAFE_MODE`）狀態。

---

## Executive Verdict（4.2 專項）

| 項目 | 判定 |
|------|------|
| **4.2 拒審風險** | **🟠 中高（約 35–55%）** |
| **核心問題** | Capacitor 殼 **100% 載入遠端 Next.js**，與 Safari 開啟同一 URL 體驗高度重疊 |
| **4.2 以外的阻擋** | Safe Mode 已緩解 3.1.1 / 2.1（Stripe、Health placeholder）；**不影響 4.2 判定** |
| **功能深度** | 有完整 onboarding、個人化計畫、外食菜單、拍照 AI、進度追蹤 — **非空殼**，但 **原生整合極薄** |

**審核員一句話：**  
「這不是沒功能的 App，但很像把網站包進 WebView；若我在 Safari 也能做同樣的事，為什麼要下載？」

---

## 1. 是否太像網站包裝？

### 結論：**是，結構上就是 Hosted Web App**

| 證據 | 位置 | 審核員解讀 |
|------|------|------------|
| Capacitor `server.url` 指向 Production URL | `capacitor.config.ts` | App 啟動 = 連線 Vercel，非本地 bundle |
| 官方文件自述「WebView 殼」「與 Safari 開啟相同」 | `docs/APPLE_IOS_SETUP.md` | 架構誠實，但 4.2 風險明確 |
| `webDir: capacitor-www` 僅佔位 HTML | `capacitor-www/index.html` | 離線時只顯示「再健一點」一行字 |
| 同站 PWA `manifest.json`（`display: standalone`） | `public/manifest.json` | 使用者可「加入主畫面」取得近似體驗 |
| iOS 改 Web 後 **不需重 build** | `APPLE_IOS_SETUP.md` | 證明 App 本質是遠端網站容器 |

### 對 4.2 的影響

Apple 4.2 常拒絕：

- 主要內容來自網頁、App 內無額外價值  
- 使用者可在 Safari 完成相同任務  
- App 只是 marketing / bookmark wrapper  

BetterBit **有實質功能**（計畫引擎、台灣外食菜單、AI 拍照估熱量），**不是空殼**。  
但 **交付形式** 仍是遠端 WebView → **4.2 紅旗仍在**。

### 加分項（降低 4.2 機率）

- 完整帳號體系、onboarding、個人化計畫、每週重算  
- 台灣在地外食組合（7-ELEVEN、全家等）— 非通用網站模板  
- 拍照 AI 食物辨識 — 有「工具感」  
- Safe Mode 下 Premium 為說明頁，無半成品按鈕  

---

## 2. 哪些地方會被認為只是 WebView？

審核員若打開 Xcode / 網路面板或對照 Safari，會看到：

| 特徵 | 現況 | WebView 指紋 |
|------|------|----------------|
| 主 UI | Next.js App Router + React | 典型 SPA/SSR 網站 |
| 路由 | `Link`、`router.push`（`/dashboard`、`/weekly`、`/progress`） | 客戶端路由，非 UINavigationController |
| 資料 | Supabase + `/api/*` on Vercel | 全遠端 API，無離線資料層 |
| 底部導覽 | CSS `fixed` + `Link`（`BottomNav.tsx`） | 非 UITabBar |
| Toast / Modal | `sonner`、自訂 sheet | 非 UIKit alert |
| 登入 | Web form → Supabase Auth | 與網站相同 |
| 法律頁 | `/privacy`、`/terms` 同域 HTML | 可在外部瀏覽器開啟 |
| 原生入口 | `CAPBridgeViewController` + WKWebView | Capacitor 預設，無自訂原生 UI |

**審核員實測對照：**

```
Safari 開 https://betterbit.app → 登入 → Today → 拍照 → 本週 → 進度
vs.
App 開啟 → 同一流程、同一 UI、同一 URL
```

若 Review Notes 寫「loads production web app inside Capacitor WebView」（`APP_STORE_METADATA.md` 已有此句），**等於主動確認 4.2 疑慮** — 誠實但不利 4.2。

---

## 3. 是否缺少原生感？

### 結論：**缺少。原生整合屬「最低配」**

**已安裝 Capacitor 插件（`package.json` / `CapApp-SPM/Package.swift`）：**

| 插件 | 用途 | 審核員感受 |
|------|------|------------|
| `@capacitor/app` | URL / lifecycle | 標配，感知弱 |
| `@capacitor/splash-screen` | 啟動畫面 1.2s | 有，但任何 Capacitor 模板都有 |
| `@capacitor/status-bar` | 狀態列樣式 | 輕微 |

**未使用、審核員期望在「健康 App」看到的原生能力：**

| 能力 | 現況 |
|------|------|
| `@capacitor/camera` | ❌ 未安裝 |
| `@capacitor/push-notifications`（APNs） | ❌ 未安裝 |
| HealthKit | ❌ placeholder 已 Safe Mode 隱藏 |
| Share / 系統分享 | ❌ 無 |
| Haptics | ❌ 無 |
| 離線快取 / Core Data | ❌ 無 |
| 原生 Tab / Navigation | ❌ 全 Web |
| Widget / Live Activity | ❌ 無 |
| 鍵盤 / Safe Area 原生處理 | 僅 CSS `safe-area-pb` |

**體驗層面：**

- Loading：`Loader2` 旋轉 — 典型 web spinner  
- 返回：`PhotoLogSheet` 自訂「返回」按鈕 — 非 iOS 標準 edge swipe 語意（WebView 可能支援 swipe，但 UI 是 web）  
- 字體 / 動效：Tailwind + web font — 精緻但仍是 web design  

**判定：** 原生感 **不足**；若功能被認可，可能 **勉強通過**；若審核員當天嚴格查 4.2，**易拒**。

---

## 4. Camera 是否真正使用 Capacitor？

### 結論：**否。使用的是 WKWebView HTML `<input type="file">`，不是 Capacitor Camera**

**實際實作（`PhotoLogSheet.tsx`）：**

```html
<input type="file" accept="image/*" capture="environment" />
<input type="file" accept="image/*" />  <!-- 相簿 -->
```

| 項目 | 說明 |
|------|------|
| 技術路徑 | Web File API → iOS 由 WebKit 叫出系統相機/相簿 picker |
| Capacitor Camera plugin | **未使用**（`package.json` 無 `@capacitor/camera`） |
| Info.plist | ✅ 有 `NSCameraUsageDescription`、`NSPhotoLibraryUsageDescription` |
| 後端 | 照片 base64 → `/api/food-photo` → Claude 辨識 |

**審核員會怎麼看：**

- ✅ 相機**能用**（若審核員測拍照記錄）  
- ⚠️ 與 Safari 行為相同 — **非 App 獨有原生能力**  
- ⚠️ Review Notes 若寫「Capacitor + Camera permission for food logging」易讓人誤以為用了 Camera plugin — 實際不是  

**4.2 影響：** 相機流程有功能價值，但 **不足以證明「非網站包裝」**。

---

## 5. Push Notification 是否需要？

### 結論：**4.2 不強制要求 Push；但現況有「假原生」風險**

**現況：**

| 項目 | 實作 |
|------|------|
| 前端 | Firebase Web FCM + `Notification.requestPermission()` + Service Worker（`firebase.ts`） |
| UI | `NotificationPrompt.tsx`（Dashboard）、`SettingsNotificationsSection.tsx` |
| 後端 | `save-push-token`、`send-notifications`、cron 排程 |
| iOS 原生 | ❌ 無 `@capacitor/push-notifications`、Info.plist **無** `UIBackgroundModes` remote-notification |

**在 iOS Capacitor WebView 內：**

- FCM Web Push 依賴 Service Worker — **WKWebView 支援有限**，與 Safari PWA 不同  
- `NotificationPrompt` 檢查 `'serviceWorker' in navigator` — 在 App 內 **可能永遠不顯示或無法成功**  
- 若 App Store 文案寫「用餐提醒、推播」但 App 內無法開啟 → **2.1 不完整**（非 4.2 主因）

**4.2 建議：**

| 策略 | 說明 |
|------|------|
| **不實作 Push 也可送審** | 健康類 App 無推播仍可通过 4.2 |
| **Metadata 勿過度承諾** | 描述避免「推播提醒」若 iOS 未實作 APNs |
| **若要做** | 應用 `@capacitor/push-notifications` + APNs，而非 Firebase Web SW |

**審核員判定：** Push **不是 4.2 必要條件**；有推播 UI 卻不能用，反而增加 **2.1** 扣分。

---

## 6. Loading、Navigation、Share 是否像網站？

### Loading

| 場景 | 表現 | 像網站？ |
|------|------|----------|
| 首次進入 | SplashScreen 1.2s → 載入遠端 URL | 前半原生、主體 web |
| 頁面切換 | Next.js client navigation，無全屏 native transition | ✅ 像 |
| API 等待 | `Loader2`、`toast`、按鈕 disabled | ✅ 像 |
| 離線 | `capacitor-www` 佔位或 WebView 錯誤頁 | ✅ 像壞掉的網站 |

### Navigation

| 項目 | 現況 |
|------|------|
| 主結構 | `(app)/layout.tsx` + `BottomNav`（3 tab） |
| 設定 | `/settings` 不在 tab，需額外入口 |
| 返回 | Web 按鈕 + 瀏覽器 history |
| Deep link | Capacitor App plugin 可接，**但未見產品級 deep link 流程** |

→ **整體導覽 = 響應式 Web App**，非 iOS Human Interface Guidelines 原生模式。

### Share

| 項目 | 現況 |
|------|------|
| 系統分享 | ❌ 無 `navigator.share`、無 Capacitor Share |
| 匯出進度 / 計畫 | ❌ 無 |

→ 健康 App 常見「分享成果」缺失 — **非必拒**，但加強「只是網站」印象。

---

## 7. 哪些地方最容易被以 4.2 拒審？

### 🔴 最高風險（審核員會直接對照 4.2）

| # | 觸發點 | 拒審理由（審核員內部措辭） |
|---|--------|---------------------------|
| **4.2-A** | 遠端 URL 載入 `betterbit.app` | App 與 Safari 體驗重複，未提供足夠原生或離線價值 |
| **4.2-B** | PWA manifest 同站可「加入主畫面」 | 使用者無需 App Store 即可取得相近體驗 |
| **4.2-C** | 原生插件僅 Splash + StatusBar | Minimum **native** functionality 不足 |
| **4.2-D** | 離線幾乎不可用 | App 依賴網路，無本地核心體驗 |
| **4.2-E** | Review Notes 自述 WebView 載入網站 | 審核員確認「repackaged website」 |

### 🟠 次高風險（功能被認可則可能放行）

| # | 觸發點 | 說明 |
|---|--------|------|
| **4.2-F** | 功能雖多但全在 web 層 | 個人化計畫、外食 DB 可能被視為「網站也有」 |
| **4.2-G** | 無裝置獨有能力 | 無 Widget、無 HealthKit、無 APNs、無離線 |
| **4.2-H** | 帳號登入後與 Web 100% 同步 | 無「僅 App 可做的事」 |

### 🟢 相對安全（有助過 4.2）

| 項目 | 說明 |
|------|------|
| 完整 onboarding + 計畫生成 | 證明非 landing page |
| 台灣外食 + AI 拍照 | 有垂直領域深度 |
| Safe Mode 無半成品 | 避免 2.1 連帶放大 4.2 負面印象 |
| 刪除帳號、法律頁齊全 | 合規加分（非 4.2 條款但影響審核心情） |

### 常見拒審信模板（4.2）

> **Guideline 4.2 - Design - Minimum Functionality**  
> Your app provides a limited user experience as it is primarily a web browsing tool. It would be more appropriate to publish a Safari Extension or optimize your web app for mobile Safari.

BetterBit **比純 bookmark 強**，但 **架構上仍落在此信範圍邊緣**。

---

## 方案 A — 最安全送審方案

**目標：** 將 4.2 拒審率壓到 **<15%**（仍無法保證，因 Apple 人工判斷）

**策略核心：** 讓審核員無法在 5 分鐘內得出「Safari 就夠了」。

| 方向 | 建議（需後續工程，本文件不實作） |
|------|----------------------------------|
| **交付型態** | 改為 **bundle 本地 web assets**（`webDir` 含 production build）或 Capacitor Live Update + 首次必備 offline shell — **降低「純遠端網站」印象** |
| **原生插件（最低集）** | `@capacitor/camera` 取代 file input；`@capacitor/haptics` 記錄成功；可選 `@capacitor/share` 分享週進度 |
| **Push** | **二選一：** 實作 APNs **或** Metadata / UI 完全不提推播 |
| **離線** | 快取「今日計畫 + 已記錄」只讀 — 飛航模式可查看 |
| **Review Notes** | 強調 **裝置整合**（相機原生 API、離線查看、（若有）推播），**不要**寫「same as Safari」 |
| **Metadata** | 不宣傳「網頁版同步」；強調 App 內個人化引擎、台灣菜單、AI 拍照 |
| **Safe Mode** | 維持 `NEXT_PUBLIC_APP_STORE_SAFE_MODE=true` 至 IAP 上線 |
| **審核素材** | 5 分鐘錄屏：onboarding → 拍照 AI → 外食骰子 → 本週計畫 → 進度 |

**預估：** 4.2 通過率 **~85%** · 工期 **3–6 週** · 與「不要新增功能」衝突 — 屬 **架構級** 調整

---

## 方案 B — 最快送審方案

**目標：** **本週內** TestFlight / App Store 送審（Safe Mode 已上線前提下）

| 步驟 | 動作 |
|------|------|
| 1 | Vercel Production 確認 `NEXT_PUBLIC_APP_STORE_SAFE_MODE=true` |
| 2 | 準備 **完整測試帳號**（已 onboarding、有計畫、可拍照） |
| 3 | Review Notes **改寫**（不修改 code）：強調產品價值，弱化「WebView 載入網站」措辭 |
| 4 | Metadata **勿寫** Apple Health、Stripe、推播（若 iOS 未實作 APNs） |
| 5 | 截圖只展示 **Today / 拍照 / 本週 / 進度 / 設定刪除帳號** — 不出 Premium 付款 |
| 6 | App Review 附 **2 分鐘操作路徑**（英文） |

**Review Notes 建議重點（英文草稿）：**

```
BetterBit is a personalized meal & workout planner for Taiwan users.
Please test: Register → Onboarding (accept health disclaimer) → Today → 
Photo food log (camera) → Weekly plan → Progress → Settings → Delete account.

iOS build: subscription and Apple Health entries are disabled; Premium is informational only.
Privacy: https://betterbit.app/privacy
```

**風險接受：**

| 項目 | 評估 |
|------|------|
| 4.2 拒審 | **35–55%** |
| 3.1.1 / 2.1 | Safe Mode 已大幅降低 |
| 若 4.2 拒 | 依 Apple 信回覆 **Resolution Center**，補方案 A 或申訴功能深度 |

**預估：** 送審 **1–3 天** · 無額外開發

---

## 方案 C — 最小修改方案

**目標：** 在 **不動架構**（仍 remote URL）下，略降 4.2 風險 · 工期 **0.5–1 週**

**僅限低侵入調整（本文件列建議，是否實作另案）：**

| # | 修改 | 4.2 效益 | 工作量 |
|---|------|----------|--------|
| C1 | Review Notes + Metadata 去 WebView 自述、強調垂直功能 | 中 | 0（Connect 層） |
| C2 | 離線時顯示 **友善原生風格** 錯誤頁（非空白 web error） | 低中 | 小 |
| C3 | iOS 隱藏 `NotificationPrompt` / 設定內 Web Push 入口（若實測無法用） | 降 2.1 連帶 | 小 |
| C4 | 接 `@capacitor/camera` **只換拍照入口**（其餘不變） | 中 | 中 |
| C5 | 啟用 `@capacitor/app` 的 back button 處理 / status bar 與 web 一致 | 低 | 小 |
| C6 | App Store 描述刪「推播」「Health 同步」直到真的實作 | 中 | 0 |

**不建議在方案 C 做：** 只改 Splash 顏色、只加 Review Notes 而不改任何體驗 — **4.2 幾乎無改善**。

**預估：** 4.2 拒審 **25–40%**（較方案 B 略好，若做 C4）

---

## 三方案對照

|  | **A 最安全** | **B 最快** | **C 最小修改** |
|--|-------------|-------------|----------------|
| **4.2 通過率（估）** | ~85% | ~50% | ~65%（含 C4） |
| **開發量** | 大 | 無 | 小中 |
| **送審速度** | 慢 | **最快** | 中 |
| **是否改 remote URL 架構** | 是 | 否 | 否 |
| **與「不要新增功能」** | 衝突最大 | **完全符合** | 部分符合 |

---

## 審核員最終備忘（4.2 專用）

若我是今日值班審核員，我會：

1. 用 Safari 開 `betterbit.app`，登入同一測試帳號  
2. 對照 App 內 Today / 拍照 / 本週 — **若 UI 與流程一致 → 記 4.2 疑慮**  
3. 關飛航模式開 App — **若只剩佔位或 error → 加深 4.2**  
4. 看設定有無 Health / Stripe 半成品 — Safe Mode **已解**  
5. 若功能完整、有 AI 拍照、有本地化外食 — **可能放行**，但會在 Notes 留「consider native features」

**現狀建議：**  
- 若 **必須快上 TestFlight** → **方案 B**（Safe Mode 已就緒）  
- 若 **曾被 4.2 拒過或要長期���運 iOS** → 規劃 **方案 A**  
- 若 **只願小改** → **方案 C4（Camera plugin）+ Review Notes 改寫**

---

## 相關文件

- [`APP_STORE_REVIEW_CHECKLIST.md`](./APP_STORE_REVIEW_CHECKLIST.md) — 3.1.1 / 2.1 全項  
- [`APPLE_IOS_SETUP.md`](./APPLE_IOS_SETUP.md) — Capacitor 架構  
- [`APP_STORE_METADATA.md`](./APP_STORE_METADATA.md) — Review Notes 草稿  
- [`APP_STORE_CHECKLIST.md`](./APP_STORE_CHECKLIST.md) — 合規 P0  

---

**文件性質：** 審核分析 only · **未修改任何程式** · 2026-06-18
