# BetterBit 官方一頁式 Landing Page — 分析文件

> 狀態：**規劃階段，尚未 coding**。本文件只做架構分析，等待確認後才會開始實作。
>
> 範圍限制：僅允許新增/修改 `src/components/marketing/`、`src/app/home/`、`public/marketing/`。
> 不修改 `src/app/page.tsx`、`RootRedirectClient.tsx`、`src/components/marketing/LandingPage.tsx`（Capacitor App 啟動流程與未登入畫面，風險太高）。
> 新頁面掛載於 **`/home`**（`src/app/home/page.tsx`），與 `/` 完全獨立。

---

## A. 完整網站架構分析

1. Header（導覽列）
2. Hero Section
3. 使用者痛點 / Value Proposition
4. 三步驟使用流程（How it works）
5. BetterBit 與一般 App 差異比較（Comparison）
6. 功能展示（Feature Showcase）
7. Pricing（方案價格）
8. FAQ（常見問題）
9. Final CTA
10. Footer

---

## B. 每個 Section 分析

### 1. Header

- **目的**：建立品牌信任感、提供快速導航、隨時可見的下載 CTA（提高轉換率的錨點）。
- **使用者心理**：訪客第一眼判斷「這是不是專業/可信的產品」；導覽讓不同意圖的訪客（想看價格 / 想看怎麼運作）快速跳轉，減少跳出率。
- **文案方向**：不需要標語，只需清楚的分類詞（首頁／功能介紹／怎麼運作／方案價格／常見問題／部落格）+ 明確行動呼籲「App Store 下載」。
- **UI layout**：左 Logo、中置導覽（錨點連結對應各 section id）、右側綠色實心 CTA 按鈕。Sticky/fixed 於頂部，滾動時輕微陰影或背景霧化。
- **Desktop 排版**：單列三欄式（logo / nav / CTA），最大寬度容器（如 1200px）置中，左右留白。
- **Mobile 排版**：僅保留 Logo + 漢堡選單圖示 + CTA（CTA 可縮成純圖示或保留但縮小 padding）；導覽項目收進下拉/抽屜選單。

### 2. Hero Section

- **目的**：3 秒內傳達核心價值主張，並直接導向下載（最高轉換率區塊）。
- **使用者心理**：外食者的痛點是「怕麻煩」與「怕算錯」；標題要直接命中「不用自己算」的省力承諾，搭配可信度訊號（評分、使用者數）降低下載前的不確定感。
- **文案方向**：
  - 主標：「外食減脂，不用自己算。」（兩行，第二行綠色強調）
  - 副標：「拍下每一餐，BetterBit 幫你估算熱量與營養，並告訴你今天接下來怎麼吃。」
  - CTA 下方補充：「14 天免費試用．隨時可取消」
  - 社會證明：星等 + 評論數（例如「4.8．來自 1,200+ 用戶評價」）
- **UI layout**：左文字欄（標題、副標、CTA、評分列），右側雙手機 mockup 交疊展示（Today Dashboard 在前，Food Analysis/Nutrition Result 在後、略錯位放大）。
- **Desktop 排版**：左右兩欄 50/50，文字置左對齊，圖片可略溢出容器右側製造動態感。
- **Mobile 排版**：改為單欄堆疊，文字置中，手機 mockup 縮小並置於文字下方（僅保留一支手機或改為兩支縮小並排，避免版面過高）。

### 3. 使用者痛點 / Value Proposition

- **目的**：讓訪客產生「這就是在講我」的共鳴，鋪陳「一般工具做不到，BetterBit 可以」的敘事，為後面的差異比較做鋪墊。
- **使用者心理**：訴諸「不是你不自律，是工具不對」——移除罪惡感、降低心理防備，讓使用者更願意嘗試。
- **文案方向**：
  - 標題：「你不是不自律，你只是缺少正確的工具」
  - 四個痛點卡片：不知道外食到底有多少熱量／每天算熱量太麻煩、太花時間／今天吃多了，不知道明天怎麼調整／一般 App 只告訴你吃了多少，沒有下一步
- **UI layout**：置中標題 + 四欄 icon 卡片（icon + 短標題 + 一行說明），無外框或極淡邊框，靠留白與圖示分隔。
- **Desktop 排版**：四欄橫向排列，等寬。
- **Mobile 排版**：改為 2 欄 × 2 列 grid，或單欄堆疊（視卡片文字長度決定，建議 2×2 較省垂直空間）。

### 4. 三步驟使用流程

- **目的**：降低「這個 App 會不會很複雜」的疑慮，具體展示使用流程只要三步，強化「好用、不麻煩」的核心承諾。
- **使用者心理**：具象化的步驟 + 真實截圖比空泛文字更有說服力，減少下載後的認知負擔預期。
- **文案方向**：
  - Step 1：拍照 — 拍下你的餐點
  - Step 2：確認 — AI 辨識食物與營養，你可以輕鬆調整份量
  - Step 3：了解 — 立即知道還能吃多少，並獲得飲食建議
- **UI layout**：三張卡片橫向排列，卡片內含步驟編號、標題、說明文字、App 截圖；卡片間以「›」箭頭連接暗示流程順序。
- **Desktop 排版**：三欄橫排，箭頭置於欄間。
- **Mobile 排版**：改為縱向堆疊（Step 1 → 2 → 3），箭頭改為向下或省略，改用編號圓點強調順序。

### 5. BetterBit 與一般 App 差異比較

- **目的**：直接對比競品／傳統飲食紀錄 App，建立差異化定位，說服「猶豫要不要換工具」的使用者。
- **使用者心理**：對比表格是強力的說服格式，X/✓ 符號視覺化立即傳達「這邊比較好」，比純文字段落更快建立信任。
- **文案方向**：
  - 左欄（一般飲食紀錄 App）：只告訴你吃了多少／營養資訊不完整或不準確／需要自己計算與調整／沒有明確的飲食建議／外食、便當資料不完整
  - 右欄（BetterBit）：告訴你接下來還能吃多少／完整營養素分析（蛋白質/碳水/脂肪）／AI 幫你計算、自動調整／根據目標與進度給你飲食建議／持續更新的台灣在地食物資料庫
- **UI layout**：兩欄卡片式比較表，中間置一支手機 mockup + 「VS」圓形徽章疊在中軸線上，製造視覺焦點。
- **Desktop 排版**：三欄（左比較欄 / 中間手機 / 右比較欄），中間手機可略微覆蓋在左右卡片之上。
- **Mobile 排版**：中間手機移到最上方或省略，左右比較欄改為縱向堆疊（先放「一般 App」灰階卡片，再放「BetterBit」綠色強調卡片），維持先劣後優的敘事順序。

### 6. 功能展示

- **目的**：讓已經被說服「值得下載」的使用者看到完整功能廣度，強化「這是一個完整的解決方案」而非單一功能工具。
- **使用者心理**：此階段訪客已產生興趣，需要的是「功能夠不夠深」的確認，避免下載後發現功能陽春而卻步。
- **文案方向**：五個功能各一個關鍵詞 + 一行效益說明，例如「熱量銀行 — 直覺顯示今日剩餘熱量收支，一目了然」。
- **UI layout**：五張等寬小卡片橫向排列，每張卡片內含小尺寸手機截圖 + 功能名稱 + 一行說明。
- **Desktop 排版**：五欄橫排（若螢幕不夠寬可考慮四欄+一欄換行，但建議維持五欄等寬 + 較小卡片尺寸）。
- **Mobile 排版**：橫向可滑動 (horizontal scroll/carousel) 或改為 2 欄 grid，避免五張卡片直接垂直堆疊造成頁面過長。

### 7. Pricing

- **目的**：主要轉換節點之一，清楚呈現方案與價格差異，並用「年繳更划算」引導使用者選擇長期方案（提高 LTV）。
- **使用者心理**：透明定價降低「怕被暗藏收費」的疑慮；年繳卡片的「最超值」徽章 + 換算月費（NT$83/月）利用錨定效應讓年繳顯得划算。
- **文案方向**：
  - 標題：「簡單透明的方案」+ 副標「14 天免費試用．隨時可取消」
  - 月繳方案 NT$190/月；年繳方案 NT$990/年（平均每月只需 NT$83），標註「最超值」
  - 兩方案下方列出功能清單（完整功能使用／AI 辨識次數無限制／營養分析與建議／進度追蹤與目標調整／隨時可取消）
  - CTA：「開始 14 天免費試用」
- **UI layout**：兩張並排的定價卡片，年繳卡片以綠色邊框/陰影/徽章強調為推薦選項。
- **Desktop 排版**：兩欄並排，年繳卡片可略放大或上移製造層級感。
- **Mobile 排版**：縱向堆疊，年繳方案卡片放在上方（優先曝光推薦選項）。

### 8. FAQ

- **目的**：排除下載前最後的疑慮（適用性、準確度、資料安全、取消機制），減少客服負擔並提高轉換完成率。
- **使用者心理**：Accordion 形式讓使用者主動點開自己在意的問題，避免資訊過載，同時滿足「我還有疑問」的心理需求。
- **文案方向**：BetterBit 適合誰？／AI 辨識準確嗎？／可以手動調整食物份量嗎？／需要每天記錄嗎？／有 14 天免費試用嗎？／如何取消訂閱？／我的資料安全嗎？／支援哪些裝置？
- **UI layout**：雙欄（desktop）或單欄（mobile）Accordion 列表，每題預設收合，點擊展開一則，圖示（+/−或 chevron）指示展開狀態。
- **Desktop 排版**：兩欄 grid，每欄各自獨立展開/收合。
- **Mobile 排版**：單欄，逐題垂直排列。

### 9. Final CTA

- **目的**：頁面最後一次轉換機會，收尾再次強化核心承諾並附上下載按鈕，避免使用者讀完全頁後流失。
- **使用者心理**：重複核心訊息 + 情境化的食物圖片（美味、真實感）在決策末端做情緒收尾，降低猶豫。
- **文案方向**：標題「外食減脂，從 BetterBit 開始」+ 副標「現在就下載，讓 AI 幫你輕鬆達成目標！」+ CTA「App Store 下載」+ 補充「14 天免費試用．隨時可取消」。
- **UI layout**：淺綠色/漸層背景色塊，左文字 + CTA，右側或背景鋪美食照片，與 Hero 首尾呼應。
- **Desktop 排版**：左右兩欄（文字 / 圖片），或圖片作為右側裁切背景。
- **Mobile 排版**：單欄堆疊，文字置中在上，圖片縮小置於下方或作為模糊背景裝飾。

### 10. Footer

- **目的**：提供次要導航、法律頁面連結（隱私權/服務條款）與品牌收尾，滿足 SEO 與信任建立（合法合規感）。
- **使用者心理**：完整的 Footer（公司資訊、支援管道、社群連結）是專業度的隱性訊號，即使多數人不會點擊。
- **文案方向**：品牌簡述一行；三欄連結（產品：功能介紹/怎麼運作/方案價格/更新內容；支援：常見問題/聯絡我們/使用條款/隱私權政策；公司：關於 BetterBit/部落格/合作夥伴）；社群 icon；版權宣告「© 2026 BetterBit All rights reserved.」
- **UI layout**：四欄（Logo+簡述 / 產品 / 支援 / 公司），底部細分隔線 + 版權文字置中或置左。
- **Desktop 排版**：四欄橫排。
- **Mobile 排版**：改為 2 欄 grid 或單欄堆疊（Logo 區塊獨立一列，其餘三欄改 2+1 或全部垂直）。

---

## C. Component Architecture

```
src/components/marketing/
├── MARKETING_PLAN.md              ← 本文件
├── LandingPage.tsx                 ← 既有檔案，不動（Capacitor App 未登入畫面）
├── MarketingHome.tsx               ← 新頁面組裝入口，只負責排列 section 順序
│
├── sections/
│   ├── SiteHeader.tsx               # 導覽列 + mobile 漢堡選單
│   ├── HeroSection.tsx
│   ├── TrustSection.tsx             # 痛點 / Value Proposition
│   ├── HowItWorks.tsx               # 三步驟
│   ├── ComparisonSection.tsx        # 差異比較
│   ├── FeatureSection.tsx           # 功能展示
│   ├── PricingSection.tsx
│   ├── FAQSection.tsx
│   ├── FinalCTA.tsx
│   └── Footer.tsx
│
└── ui/
    ├── PhoneMockup.tsx               # 共用手機外框元件，內部塞截圖
    ├── AppStoreButton.tsx            # 共用 CTA 按鈕
    ├── SectionTitle.tsx              # 標題 + 副標的共用排版
    ├── FeatureCard.tsx               # 痛點卡片 / 功能展示卡片共用
    ├── PricingCard.tsx
    └── FaqAccordionItem.tsx
```

**掛載路徑**：`src/app/home/page.tsx` → `import MarketingHome from '@/components/marketing/MarketingHome'`。

**沿用現有資源**（避免重造輪子、維持視覺一致性）：
- `BetterBitLogo`（`src/components/brand/BetterBitLogo.tsx`）
- 品牌色 token：`--bb-accent-green: #76b69a`、深綠 `#2D4A3E`
- 字體：`layout.tsx` 已設定 Inter + Noto Sans TC（`var(--font-noto-tc), var(--font-inter)`）
- Icon：`lucide-react`（專案已安裝，Header 檔已在用）
- 目前專案未安裝 `framer-motion`；Accordion／hover 效果先以 CSS transition 實作，如需進場動畫再另行評估是否加套件。

---

## D. 圖片素材需求

```
public/marketing/
├── hero-food-plate.png        ← 需要真實素材（食物照片，用於 Hero 第二支手機的營養結果畫面情境）
├── final-cta-food-bowls.jpg   ← 需要真實素材（Final CTA 區塊背景/情境美食照）
```

**可以純 CSS/SVG 完成（不需圖片檔）：**
- 手機外框（`PhoneMockup` 用 CSS border-radius + box-shadow 繪製機身，螢幕內容用截圖填入）
- 所有 icon（lucide-react 向量圖示：相機、圓餅圖、勾/叉、chevron 等）
- Pricing 卡片、FAQ、比較表格的視覺樣式（邊框、陰影、圓角、徽章）
- Header/Footer 版面、色塊背景、漸層

**需要真實 App Screenshot（見 E 節）：**
- Hero 雙手機畫面
- 三步驟三張截圖
- 差異比較中間手機
- 功能展示五張截圖

---

## E. App Screenshot 規劃

**Hero：**
- Today Dashboard（今日熱量圓餅圖 + 三大營養素進度條）
- Food Analysis / 營養結果（單筆餐點的辨識結果畫面）

**三步驟：**
- 拍照頁（相機取景畫面）
- AI 分析結果（辨識出的食物清單 + 可調整份量）
- 今日飲食建議（剩餘熱量 + 下一餐建議）

**差異比較：**
- 中間手機沿用 Today Dashboard 截圖即可（可重複使用 Hero 素材，不需另外提供）

**功能展示：**
- 熱量銀行（Calorie Bank）
- 每日目標與調整（Daily Plan / Goal Adjustment）
- 進度追蹤（Progress / 趨勢圖表）
- 營養素分析（蛋白質/碳水/脂肪 breakdown）
- 運動紀錄（Workout Log）

實際需要提供：最多 **8 張截圖**（Today Dashboard 可在 Hero 與比較區重複使用）。

---

## F. 開發順序建議

**Phase 1 — 建立架構**
- 建立 `MarketingHome.tsx` 與所有 section/ui 空殼元件（純結構 + 假文字，無圖）
- 確認 `/home` route 可正常渲染、不影響 `/` 與 Capacitor 啟動流程
- 完成 Header 導覽的錨點連結（scroll to section）

**Phase 2 — 加入圖片與 mockup**
- 使用者提供的 App 截圖放入 `PhoneMockup`
- 加入 `public/marketing/` 的兩張情境圖片
- 補齊各 section 的正式文案（依本文件 B 節）

**Phase 3 — Responsive 優化**
- 逐一 section 檢查 desktop / tablet / mobile 斷點（依 B 節列出的排版差異調整）
- 功能展示區的 mobile 滾動/grid 行為驗證
- FAQ、Pricing 卡片在小螢幕下的間距與可讀性檢查

**Phase 4 — SEO 與轉換優化**
- `metadata`（title/description/OG image）、語意化 heading 結構（h1/h2 階層）
- CTA 按鈕文案 A/B 檢查、App Store 連結正確性
- 效能檢查（圖片壓縮/`next/image`、Lighthouse 分數）
- 轉換追蹤（如已有 analytics/growth 模組，評估是否需要事件埋點 — 但不改動 `src/lib/subscription*`、Supabase、RevenueCat 相關程式）

---

## G. 開發限制（Coding 前必須遵守）

### 1. Marketing Landing Page 必須完全獨立於 App 產品流程

**禁止**任何 `src/components/marketing/**` 元件 import 以下任何內容：

- `auth`（`src/features/auth/`、任何登入/登出/session 邏輯）
- `subscription`（`src/lib/subscription*`）
- `supabase`（`src/lib/supabase/`、任何 Supabase client/query）
- `revenuecat`（RevenueCat 相關 SDK 或 wrapper）
- `capacitor`（`src/components/capacitor/`、`capacitor.config.ts`、任何 Capacitor plugin）
- App 內部 feature 元件（`src/features/*`、`src/components/dashboard/`、`src/components/progress/`、`src/components/record/`、`src/components/settings/`、`src/components/onboarding/`、`src/components/week/` 等）

**只能** import：

- Brand components（`src/components/brand/`，例如 `BetterBitLogo`）
- Marketing components（`src/components/marketing/**` 內部互相 import）
- UI components（`src/components/ui/` 中純展示、無業務邏輯的元件，例如 button/card 之類的樣式元件）
- `lucide-react`（icon）
- Next.js 內建 API（`next/link`、`next/image` 等靜態用途）

### 2. `/home` route 必須只作為公開靜態網站

`src/app/home/page.tsx` 與其底下所有元件：

- **不可**檢查登入狀態（不可讀取 session、不可判斷使用者是否已登入）
- **不可** redirect 使用者（不可依任何條件導向 `/dashboard`、`/login` 等其他路徑）
- **不可**呼叫任何 API route（不可 `fetch('/api/...')`）
- **不可**讀取 Supabase（不可 import 或呼叫任何 Supabase client）

整頁必須可以在完全登出、無 session、無網路資料庫連線的情況下正常渲染（純靜態內容 + 連結）。

### 3. App Store CTA 一律使用 placeholder URL

所有「App Store 下載」相關按鈕（Header CTA、Hero CTA、Final CTA 等）先統一使用：

```ts
const APP_STORE_URL = "#"
```

不自行猜測正式的 App Store 連結，也不修改其他設定（例如 metadata、manifest、環境變數等）。待使用者提供正式連結後再替換。

---

*本文件僅為分析與規劃，尚未建立任何 React 元件或修改既有程式碼。*
