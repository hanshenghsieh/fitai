# BetterBit App Store 素材規格

**建立日期：** 2026-06-18  
**正式網址：** https://betterbit.app  
**Bundle ID：** `app.fitai.betterbit`  
**參考規範：** [Apple Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications) · [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)

> 本文件只整理**上架所需圖片／影片素材**，不修改任何程式。  
> 建議素材存放路徑：`assets/app-store/`（尚未建立，由設計／行銷補檔）

---

## 總覽 Checklist

| 素材 | 優先級 | 必須？ | 狀態 |
|------|--------|--------|------|
| App Icon 1024×1024 | **P0** | ✅ 必須 | ⬜ 待製作 |
| iPhone 6.9" 截圖 ×6 | **P0** | ✅ 必須（至少 1 張；建議 6 張） | ⬜ 待製作 |
| 隱私／條款／支援 URL | **P0** | ✅ 必須 | ✅ 已上線 |
| Xcode App Icon set | **P0** | ✅ 必須（真機／TestFlight） | ⬜ 待匯入 |
| App Store 文案 | **P0** | ✅ 必須 | 見 [`APP_STORE_METADATA.md`](./APP_STORE_METADATA.md) |
| Feature Graphic 1200×630 | **P1** | 建議 | ⬜ 待製作 |
| App Preview 影片 30s | **P2** | 可選 | ⬜ 可後補 |
| iPad 13" 截圖 | **P2** | 僅 iPad 版需要 | ⬜ 本 App 為 iPhone only |

---

## P0 / P1 / P2 定義

| 級別 | 意義 |
|------|------|
| **P0** | 沒有就**無法提交** App Store Connect，或極高機率拒審 |
| **P1** | 不阻擋上架，但**明顯影響轉換率**（列表點擊、分享、OG 預覽） |
| **P2** | **可上架後補**；不影響首次審核通過 |

---

# App Icon

## 規格（Apple 最新要求）

| 項目 | 要求 |
|------|------|
| 尺寸 | **1024 × 1024 px** |
| 格式 | **PNG** |
| 色彩 | **RGB**，**不可含 Alpha 通道**（無透明） |
| 圓角 | **不要**在檔案內加圓角 — Apple 自動裁切 |
| 文字 | **不要** |
| 邊框 | **不要** |
| 陰影 | **不要** |
| 風格 | 簡潔、可辨識；符合 BetterBit 茶棕 calm 調性（`#F4F2EE` / `#7A756D`） |

## 需交付檔案

```
assets/app-store/icon/
└── icon-1024.png          ← App Store Connect 上傳用
```

## 同步至 Xcode（P0）

匯入後一併更新：

```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

> 目前 repo 僅有 `public/icon.svg`，**不符合** App Store 1024 PNG 要求。

---

# iPhone Screenshots

## 裝置類別（2026 規範）

| 項目 | 值 |
|------|-----|
| Display class | **6.9"**（iPhone 16 Pro Max / 17 Pro Max 等） |
| 方向 | **直式 Portrait** |
| 解析度 | **1320 × 2868 px**（建議；Apple 亦接受 1290×2796、1260×2736） |
| 格式 | **PNG**（或 JPEG；建議 PNG） |
| 數量 | App Store Connect：**1–10 張**；本專案規劃 **6 張** |
| Alpha | **不可**含透明通道 |
| 縮放 | 只交 6.9" 一組即可；Apple 自動縮放至較小 iPhone |

> **iPhone only App：** 只需 6.9" 一組。不需另交 6.5" / 6.1" 除非要像素級控制。

## 需交付檔案

```
assets/app-store/screenshots/iphone-6.9/
├── 01-hero.png
├── 02-photo-ai.png
├── 03-recovery.png
├── 04-week.png
├── 05-progress.png
└── 06-brand.png
```

## 截圖 ↔ App 頁面對照

| 檔名 | 建議擷取頁面 | 路由 | 畫面重點（給設計／截圖用） |
|------|-------------|------|---------------------------|
| **01-hero.png** | **Today** | `/dashboard` | 今日主畫面：「今天吃什麼？」、餐次、熱量進度、再健陪伴感 |
| **02-photo-ai.png** | **Photo** | `/dashboard` → 拍照記錄 | 食物拍照流程：相機／相簿、AI 估算、零表單加入 |
| **03-recovery.png** | **Today（Recovery）** | `/dashboard` | 熱量銀行／恢復視窗、無罪惡感文案、今日恢復狀態 |
| **04-week.png** | **Week** | `/weekly` | 本週計畫：三餐＋運動、外食／自煮、一週概覽 |
| **05-progress.png** | **Progress** | `/progress` | 體重／體脂趨勢、達成率、週回饋閉環 |
| **06-brand.png** | **Premium** 或 **Settings** | `/settings/premium` 或 `/settings` | 會員價值／品牌調性：BetterBit 會員、設定頁「關於 BetterBit」 |

### 頁面對照速查

| App 頁面 | 用於哪張截圖 |
|----------|-------------|
| Today | 01-hero、03-recovery |
| Photo | 02-photo-ai |
| Week | 04-week |
| Progress | 05-progress |
| Premium | 06-brand（首選） |
| Settings | 06-brand（備選） |

## 截圖製作建議（P1 品質）

- 使用 **iPhone 16 Pro Max 真機** 或 Xcode Simulator（6.9"）擷取，再套版至 1320×2868
- 可加上**繁中標語**（App Store 常見做法）；標語放在截圖外框／背景，**不要**放進 App Icon
- 狀態列可保留或統一為 9:41（Apple 行銷慣例）
- 使用**已登入、有資料**的測試帳號（避免空白計畫）
- **不要**出現未完成的「Apple Health 連接」或「會員準備中」狀態（審核風險）

## 擷取流程（Mac + Xcode）

```bash
# 1. 同步 iOS 殼指向正式站
CAP_SERVER_URL=https://betterbit.app npm run cap:sync
npm run cap:open:ios

# 2. iPhone 16 Pro Max Simulator → 登入測試帳 → 各頁截圖
# 3. 匯出 1320×2868 PNG → 放入 assets/app-store/screenshots/iphone-6.9/
```

---

# App Preview Video（可選 · P2）

## 規格

| 項目 | 建議值 | Apple 6.9" 官方接受值 |
|------|--------|----------------------|
| 長度 | **15–30 秒**（本專案目標 **30 秒**） | 15–30 秒 |
| 方向 | **直式** | Portrait |
| 解析度 | **1080 × 1920**（剪輯用） | **886 × 1920**（6.9" 上傳） |
| 格式 | **.mov**、**.mp4**、**.m4v** | H.264 / ProRes |
| 音軌 | 可選 | 可選 |

> 上傳 App Store Connect 前，請以 **886×1920** 輸出最終檔（或依 Connect 當下提示的尺寸）。

## 建議檔名

```
assets/app-store/video/
└── betterbit-preview-30s.mp4
```

## 分鏡腳本（30 秒）

| 時間 | 畫面 | 來源頁 |
|------|------|--------|
| 0–6s | Today 主畫面、骰子／今日計畫 | `/dashboard` |
| 6–12s | 拍照記錄 → AI 估算 | Photo flow |
| 12–18s | 本週計畫 scroll | `/weekly` |
| 18–24s | 進度圖表 | `/progress` |
| 24–27s | Recovery／熱量銀行 | `/dashboard` |
| 27–30s | Logo 結尾＋「再健一點」 | 品牌畫面 |

---

# Feature Graphic

## 用途

| 用途 | 尺寸 | 優先級 |
|------|------|--------|
| Open Graph / 社群分享 | **1200 × 630 px** | **P1** |
| Twitter / Facebook / LINE 預覽 | 同上 | P1 |

> 此尺寸**不是** App Store Connect 必填欄位，但 `betterbit.app` 分享、行銷帖文需要。

## 需交付檔案

```
assets/app-store/social/
└── og-feature-1200x630.png
```

## 設計要點

- 左側或中央：App 主視覺／手機 mockup
- 文案：「照著做就好」或「再健一點 · BetterBit」
- 背景：品牌色 `#F4F2EE`
- **不要**在 OG 圖使用 App Icon 1024 直接縮放（比例不對）

## 對應程式位置（上線後可驗證）

- `metadata.openGraph` 可於後續指向此圖（目前尚未設定 og:image 檔案）
- 路徑建議：`https://betterbit.app/og-feature-1200x630.png`（部署時置於 `public/`）

---

# 隱私與支援頁（P0 · 已就緒）

以下 URL **可直接填入 App Store Connect**，無需修改程式：

| 欄位 | URL |
|------|-----|
| **Privacy Policy URL** | https://betterbit.app/privacy |
| **Terms of Use**（EULA 或連結） | https://betterbit.app/terms |
| **Support URL** | https://betterbit.app/support |
| **Marketing URL**（選填） | https://betterbit.app |

### Connect 填寫位置

1. **App Information** → Privacy Policy URL  
2. **App Information** → Support URL  
3. **Pricing and Availability** → 依地區  
4. **App Privacy** → 問卷（另見 [`APP_STORE_CHECKLIST.md`](./APP_STORE_CHECKLIST.md)）

---

# 完整素材 Checklist

## P0 — 阻擋上架（必須）

- [ ] `icon-1024.png`（1024×1024，無透明）
- [ ] Xcode `AppIcon.appiconset` 已匯入
- [ ] iPhone 6.9" 截圖至少 **1 張**（建議交齊 **6 張**）
  - [ ] `01-hero.png`
  - [ ] `02-photo-ai.png`
  - [ ] `03-recovery.png`
  - [ ] `04-week.png`
  - [ ] `05-progress.png`
  - [ ] `06-brand.png`
- [ ] App Store 文案（[`APP_STORE_METADATA.md`](./APP_STORE_METADATA.md)）
- [ ] Privacy / Terms / Support URL 可公開訪問
- [ ] App Preview：**非必須**（可跳過）

## P1 — 增加轉換率（強烈建議）

- [ ] 6 張截圖皆含繁中標語／品牌一致視覺
- [ ] `og-feature-1200x630.png`（分享預覽）
- [ ] 截圖使用「有資料」的示範帳號
- [ ] 統一 App Store 顯示名稱（再健一點 vs BetterBit）

## P2 — 可之後補

- [ ] App Preview 30 秒影片
- [ ] 6.5" / 6.1" 獨立截圖組（非必要）
- [ ] iPad 13" 2064×2752（僅 iPad 版需要）
- [ ] 本地化英文截圖／文案（若拓展美國區）

---

## 資料夾結構（建議）

```
assets/app-store/
├── icon/
│   └── icon-1024.png
├── screenshots/
│   └── iphone-6.9/
│       ├── 01-hero.png
│       ├── 02-photo-ai.png
│       ├── 03-recovery.png
│       ├── 04-week.png
│       ├── 05-progress.png
│       └── 06-brand.png
├── social/
│   └── og-feature-1200x630.png
└── video/
    └── betterbit-preview-30s.mp4
```

---

## 相關文件

- [`APP_STORE_METADATA.md`](./APP_STORE_METADATA.md) — 名稱、描述、關鍵字、審核備註
- [`APP_STORE_CHECKLIST.md`](./APP_STORE_CHECKLIST.md) — 完整 P0 合規
- [`APPLE_IOS_SETUP.md`](./APPLE_IOS_SETUP.md) — Xcode / TestFlight
- [`DOMAIN_MIGRATION_REPORT.md`](./DOMAIN_MIGRATION_REPORT.md) — 正式網域
