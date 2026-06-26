# Menu Backfill Sprint Tracker

> **目標：** 建立台灣最可信的外食營養資料庫 — 每一批都是 Production Ready，不追求完成速度。
>
> **政策：** Zero Hallucination — 禁止 AI 猜測菜單、禁止 AI 猜測營養、禁止降低資料品質。

---

## 計畫概覽

| 項目 | 值 |
|------|-----|
| 終極目標 | **2,000** 家餐廳（可追溯官方／交叉驗證營養） |
| 每 Sprint 批次 | **50** 家（Sprint 1 試點 30 家） |
| 預計 Sprint 數 | **40**（30 + 38×50 + 20 = 2,000） |
| 現行 Allowlist | **600** 家（`data/food-kb/food-source-allowlist.json`） |
| 累積完成（Sprint 1） | **30** 家目標 / **14** 家 `production_candidate` |
| Runtime 覆蓋（基線） | **150 / 600** 餐廳（25%）· **252** 推薦可用品項 |

### 批次原則

1. **不准一次補完全部** — 固定 50 家／Sprint，QA 全通過後才進 Founder Review。
2. **Founder 核准後才 Promotion** — 寫入 Runtime；再開始下一批。
3. **Staging only until promoted** — `data/food-kb/staging/manifest.json` 不覆蓋 production。

---

## 每 Sprint 必須完成的關卡

每批 50 家餐廳，**全部**通過以下關卡後，方可提交 Founder Review：

| # | 關卡 | 指令 / 產出 |
|---|------|-------------|
| 1 | Restaurant Verification | 每家 ≥2 來源（不同 priority tier）· `restaurant_sources[]` |
| 2 | Menu Verification | 每家 top 20 真實品項（無來源不補） |
| 3 | Nutrition Verification | `nutrition_trace` + `verification` · 衝突標記不平均 |
| 4 | Recommendation QA | `npm run qa:recommendation` |
| 5 | Food Intelligence Layer | `npm run food-intelligence:layer` |
| 6 | Confidence | A/B 可推薦 · C 僅搜尋 · **D 阻擋 runtime** |
| 7 | Explainability | 每品項 `recommendation_rules` + `explain[]` 非空 |

### Promotion 流程（Founder 核准後）

```
Sprint N 完成 → QA 全通過 → Founder Review → 核准 → Promote to Runtime → Sprint N+1
```

**禁止：** 未核准即寫入 production · 未 QA 即標記 `production_candidate` · 硬補無來源品項。

---

## 每 Sprint 回報模板（10 項）

| # | 指標 | 說明 |
|---|------|------|
| 1 | 新增餐廳數 | 本 Sprint 首次達 `production_candidate` 的餐廳數 |
| 2 | 新增菜單數 | 本 Sprint 新增可追溯品項數 |
| 3 | A/B/C/D 分布 | 品項級 confidence 分布 |
| 4 | QA 通過率 | 本 Sprint 品項通過 Restaurant/Menu/Nutrition/Recommendation QA 的比例 |
| 5 | source_url 缺失數 | 缺 `source_url` 的餐廳或品項數（目標 **0**） |
| 6 | nutrition conflict 數 | 跨來源營養衝突待審數（目標 **0** 或已 resolve） |
| 7 | production_candidate 數 | 累積可晉升餐廳／品項數 |
| 8 | 推薦可用品項增加數 | Promotion 後 runtime A/B 品項淨增加 |
| 9 | Runtime Coverage % | `有菜單餐廳數 / allowlist` · `A/B品項 / runtime總品項` |
| 10 | 下一批建議補哪些品牌 | 依 P0/P1 排名、Sprint draft 殘留、官方營養可得性 |

---

## 累積進度總表

| Sprint | 批次 | 累積目標 | 狀態 | Phase |
|--------|-----:|--------:|------|-------|
| **1** | 30 | 30 | ✅ 完成（待 Promotion） | P0 試點 |
| **2** | 50 | 80 | ✅ build 完成 | P0 完成 + 零售擴充 |
| **3** | 50 | 130 | ✅ build + Founder 核准 Promotion | 燒肉 · 拉麵 · 韓式 |
| **4** | 50 | 180 | ⏸ ONR 待補 | 火鍋 · 麻辣（0 品項 — 無官方營養） |
| **5** | 50 | 230 | 🔄 進行中 | 牛排 · 西餐 |
| 5 | 50 | 230 | ⏳ | P0 牛排／西餐 |
| 6 | 50 | 280 | ⏳ | P0 泰式／咖啡甜點 |
| 7 | 50 | 330 | ⏳ | P0/P1 便當／麵食 |
| 8 | 50 | 380 | ⏳ | P1 牛肉麵／小吃 |
| 9 | 50 | 430 | ⏳ | P1 鐵板／牛排館 |
| 10 | 50 | 480 | ⏳ | P1 港式／日式 |
| 11 | 50 | 530 | ⏳ | P1 韓式／炸雞 |
| 12 | 50 | 580 | ⏳ | P1 夜市／商圈（精選攤位） |
| 13 | 50 | 630 | ⏳ | Allowlist 殘餘 + 擴充池 |
| 14–24 | 50×11 | 1,180 | ⏳ | 擴充池 601–1,180 |
| 25–39 | 50×15 | 1,930 | ⏳ | 擴充池 1,181–1,930 |
| 40 | 70 | **2,000** | ⏳ | 最終補齊 |

> **備註：** Allowlist 目前 600 家；Sprint 13 起需同步擴充 `food-source-allowlist.json` v3（rank 601–2,000），每批候選須先通過 Restaurant Verification 再納入。

---

## Sprint 1 — ✅ 完成（試點 30 家）

**期間：** 2026-06 · **狀態：** QA 通過 · **Founder Review：** 待核准 Promotion

### 10 項回報

| # | 指標 | Sprint 1 結果 |
|---|------|---------------|
| 1 | 新增餐廳數 | **14**（`production_candidate`）/ 30 目標 |
| 2 | 新增菜單數 | **123** 品項（staging） |
| 3 | A/B/C/D 分布 | A **14** · B **109** · C **0** · D **0** |
| 4 | QA 通過率 | Staging 品項 **100%**（123/123 可追溯）· Runtime-wide Recommendation QA **75%** |
| 5 | source_url 缺失數 | **0** |
| 6 | nutrition conflict 數 | **0** |
| 7 | production_candidate 數 | **14** 餐廳 · **123** 品項 |
| 8 | 推薦可用品項增加數 | **0**（尚未 Promotion；runtime 仍 **252** A/B） |
| 9 | Runtime Coverage % | 餐廳 **25%**（150/600）· 推薦品項 **3.9%**（252/6,400） |
| 10 | 下一批建議 | 見 Sprint 2 品牌清單 |

### 已完成餐廳（14）

麥當勞 · 肯德基 · 摩斯漢堡 · Subway · 三商巧福 · 鬍鬚張 · 吉野家 · Sukiya · 丸龜製麵 · 7-11 · 全家 · 星巴克 · 路易莎 · cama café

### Sprint 1 Draft（16 家 — 納入 Sprint 2 優先完成）

漢堡王 · 八方雲集 · 四海遊龍 · 藏壽司 · 壽司郎 · 爭鮮 · 萊爾富 · OK超商 · 全聯 · 家樂福 · Costco · 50嵐 · 清心福全 · CoCo · 可不可熟成紅茶 · 迷客夏

### 關卡完成度

| 關卡 | 狀態 |
|------|------|
| Restaurant Verification | ✅ 30/30 有 ≥2 來源 |
| Menu Verification | ⚠️ 14/30 有品項（其餘無官方營養不硬補） |
| Nutrition Verification | ✅ 123/123 完整 macros |
| Recommendation QA | ✅ `npm run qa:recommendation` pass |
| Food Intelligence Layer | ✅ 123 profiles · 100% 覆蓋 |
| Confidence | ✅ 全 A/B（staging） |
| Explainability | ✅ 全品項有 rules + explain |

### 產出檔案

- `data/food-kb/staging/sprint-1/brands.json`
- `data/food-kb/staging/manifest.json`
- `data/food-kb/staging/food-intelligence-manifest.json`
- `docs/MENU_BACKFILL_SPRINT_1_REPORT.md`

---

## Sprint 2 — 🔄 進行中（50 家）

**目標：** 完成 Sprint 1 殘留 16 家 draft + 新增 34 家 P0 高頻品牌  
**配置：** `data/food-kb/staging/sprint-2/brands.json`（✅ 骨架已建 · 50 家 · 待營養頁面人工確認）  
**狀態：** Founder 已核准進入 Sprint 2

### Sprint 2 品牌清單（50）

#### A. 完成 Sprint 1 Draft（16）

| # | 品牌 | 優先補齊原因 |
|---|------|-------------|
| 1 | 漢堡王 | 官方營養表待人工驗證 |
| 2 | 八方雲集 | 官方網站無完整營養 — 需 secondary source |
| 3 | 四海遊龍 | 同上 |
| 4 | 藏壽司 | 日本總部/台灣官網營養 |
| 5 | 壽司郎 | 同上 |
| 6 | 爭鮮迴轉壽司 | 官網品項營養 |
| 7 | 萊爾富 | 鮮食官方營養標示（目標 200 品項額度） |
| 8 | OK超商 | 同上 |
| 9 | 全聯 | 熟食區官方營養標示 |
| 10 | 家樂福 | 熟食/烘焙官方標示 |
| 11 | Costco | 熟食區營養標示 |
| 12 | 50嵐 | 手搖飲糖分/熱量公開資料 |
| 13 | 清心福全 | 同上 |
| 14 | CoCo | 同上 |
| 15 | 可不可熟成紅茶 | 同上 |
| 16 | 迷客夏 | 同上 |

#### B. 新增 P0 高頻（34）

| # | 品牌 | Allowlist Rank | 類別 |
|---|------|---------------:|------|
| 17 | 愛買 | 10 | 量販熟食 |
| 18 | 大潤發 | 11 | 量販熟食 |
| 19 | 美廉社 | 12 | 超市 |
| 20 | 丹丹漢堡 | 21 | 速食 |
| 21 | 頂呱呱 | 22 | 速食 |
| 22 | 拿坡里 | 23 | 速食 |
| 23 | 必勝客 | 24 | 速食 |
| 24 | 達美樂 | 25 | 速食 |
| 25 | 大戶屋 | 28 | 日式定食 |
| 26 | YAYOI彌生軒 | 29 | 日式定食 |
| 27 | 合點壽司 | 35 | 日式 |
| 28 | 金子半之助 | 36 | 日式 |
| 29 | 石二鍋 | 42 | 火鍋 |
| 30 | 12MINI | 43 | 火鍋 |
| 31 | 這一鍋 | 44 | 火鍋 |
| 32 | 鼎王 | 46 | 火鍋 |
| 33 | 馬辣 | 47 | 火鍋 |
| 34 | 瓦城 | 52 | 泰式 |
| 35 | 大心 | 55 | 泰式 |
| 36 | 西堤牛排 | 48 | 牛排 |
| 37 | 陶板屋 | 49 | 牛排 |
| 38 | 築間 | 41 | 燒肉/鍋物 |
| 39 | 金色三麥 | 56 | 餐酒 |
| 40 | 85度C | 62 | 咖啡烘焙 |
| 41 | 伯朗咖啡 | 63 | 咖啡 |
| 42 | 丹堤咖啡 | 64 | 咖啡 |
| 43 | 一芳水果茶 | 擴充 | 手搖飲 |
| 44 | 金峰魯肉飯 | 擴充 | 小吃 |
| 45 | 大埔鐵板燒 | 擴充 | 鐵板 |
| 46 | 貴族世家 | 擴充 | 牛排 |
| 47 | bb.q CHICKEN | 擴充 | 炸雞 |
| 48 | 林東芳牛肉麵 | 擴充 | 麵食 |
| 49 | 饗泰多 | 54 | 泰式 |
| 50 | 非常泰 | 53 | 泰式 |

### Sprint 2 目標（2026-06-25 build）

| # | 指標 | 目標 | 實際 |
|---|------|------|------|
| 1 | 新增餐廳數 | ≥35 `production_candidate` | **3**（本 Sprint 新達標） |
| 2 | 新增菜單數 | ≥700（上限，依官方可得） | **+10**（累積 **133**） |
| 3 | A/B/C/D 分布 | A/B ≥95% · D=0 | **10 B** · D=0 |
| 4 | QA 通過率 | 100% staging 品項 | **100%**（10/10） |
| 5 | source_url 缺失數 | **0** | **0** |
| 6 | nutrition conflict 數 | **0** 或已 resolve | **0** |
| 7 | production_candidate 數 | 累積 ≥49 餐廳 | **17** 累積（14 Sprint1 + 3 Sprint2） |
| 8 | 推薦可用品項增加數 | Promotion 後 +staging A/B | _待 Promotion_ |
| 9 | Runtime Coverage % | 餐廳 ≥30% | Staging **64** 餐廳 · Runtime 仍 **25%** |
| 10 | 下一批建議 | Sprint 3：燒肉/拉麵/牛肉麵 | 見報告 |

**Sprint 2 新達標：** 丹丹漢堡（2）· 85度C（5）· 伯朗咖啡（3）

**瓶頸：** 47/50 家尚無可追溯官方營養頁面 — 符合 Zero Hallucination，未硬補。

### Sprint 2 執行指令

```bash
npm run backfill:sprint-2
npm run qa:backfill
npm run qa:recommendation
npm run food-intelligence:layer
npm test
npm run build
# 報告：docs/MENU_BACKFILL_SPRINT_2_REPORT.md
```

---

## Sprint 3–12 — Allowlist 600 殘餘（規劃）

| Sprint | 主題集群 | 代表品牌（各批 50） |
|--------|----------|---------------------|
| **3** | 燒肉 · 拉麵 · 韓式 | 乾杯 · 老乾杯 · 燒肉同話 · 胡同 · 茶六 · 一風堂 · 一蘭 · Nagi · 姜虎東 · 起家雞 |
| **4** | 火鍋 · 麻辣 · 石頭 | 辛殿 · 無老鍋 · 老四川 · 肉多多 · 聚北海道鍋物 · 青花驕 · 尬鍋 |
| **5** | 王品集團 · 西餐 | 王品牛排 · 原燒 · 藝奇 · 品田牧場 · 夏慕尼 · TGI Fridays · Chili's |
| **6** | 川湘 · 中式連鎖 | 1010湘 · 時時香 · 開飯川食堂 · 瓦城衛星店 · 度小月 |
| **7** | 便當 · 飯包 · 滷味 | 鬍鬚張便當 · 佳味鮮 · 東池飯包 · 弘爺漢堡 · 梁社漢 |
| **8** | 牛肉麵 · 麵線 · 小吃 | 永康 · 劉山東 · 建宏 · 阿宗麵線 · 阜杭豆漿 · 永和豆漿 |
| **9** | 鐵板 · 平價牛排 | 紅花鐵板 · 孫東寶 · 我家牛排 · 八方雲集衛星 |
| **10** | 港式 · 飲茶 | 添好運 · 檀島 · 京星港式 · 了凡油雞飯 |
| **11** | 日式炸物 · 豬排 · 丼飯 | 銀座杏子 · 靜岡勝政 · 大阪王將 · 京都勝牛 |
| **12** | 夜市精選 · 冰品 · 剩餘 P1 | 士林/饒河/寧夏精選攤位 · 東區粉圓 · 三兄妹雪花冰 |

---

## Sprint 13–40 — 擴充至 2,000（規劃）

| Sprint 範圍 | 累積目標 | 工作內容 |
|-------------|--------:|----------|
| 13–18 | 880 | Allowlist v3 排名 601–880 · 區域連鎖 · 醫院/學校周邊高頻 |
| 19–24 | 1,180 | 排名 881–1,180 · 縣市代表餐廳 |
| 25–30 | 1,480 | 排名 1,181–1,480 · 夜市攤位標準化（單品 top 20） |
| 31–36 | 1,780 | 排名 1,481–1,780 · 健身友善品項專批 |
| 37–39 | 1,930 | 排名 1,781–1,930 · 缺口補齊 |
| **40** | **2,000** | 最終 70 家 · 全庫 QA 回歸 |

**擴充池准入條件（Sprint 13+）：**

1. 完成 Restaurant Verification（≥2 來源）
2. 納入 `food-source-allowlist.json` v3 候選
3. Founder 核准該批主題後方可開工

---

## 品質紅線（全 Sprint 適用）

| 禁止 | 替代做法 |
|------|----------|
| 一次補完全部 | 固定 50 家／Sprint |
| 降低資料品質 | 無來源 → `draft`，不升 `production_candidate` |
| AI 猜測菜單 | 僅 official-ref / 交叉驗證來源 |
| AI 猜測營養 | 衝突標記 `pending_review`，不平均 |
| 未核准寫入 Production | Staging → Founder Review → Promote |
| 偽裝官方套餐 | `meal_graph_edges` 標註「建議搭配（非官方套餐）」 |

---

## 相關文件與指令

| 資源 | 路徑 |
|------|------|
| Staging manifest | `data/food-kb/staging/manifest.json` |
| Missing queue | `data/food-kb/staging/missing-restaurants.json` |
| Sprint 1 報告 | `docs/MENU_BACKFILL_SPRINT_1_REPORT.md` |
| Acceptance QA | `docs/MENU_BACKFILL_ACCEPTANCE_REPORT.md` |
| Recommendation QA | `docs/RECOMMENDATION_QA_REPORT.md` |
| Food Intelligence | `docs/FOOD_INTELLIGENCE_LAYER_REPORT.md` |
| Allowlist | `data/food-kb/food-source-allowlist.json` |

```bash
npm run qa:backfill              # Acceptance report
npm run qa:recommendation        # Recommendation QA
npm run food-intelligence:layer  # Intelligence manifest
npx tsx scripts/menu-backfill/list-missing-restaurants.ts
```

---

## 變更紀錄

| 日期 | 事件 |
|------|------|
| 2026-06-25 | Sprint 1 完成 · Food Intelligence Layer 123 profiles |
| 2026-06-25 | Founder 核准進入 Sprint 2 · 建立本 Tracker |
| 2026-06-25 | Sprint 2 `brands.json` 骨架（50 家來源配置） |
| 2026-06-25 | Sprint 2 build：`backfill:sprint-2` · +10 品項 · 3 家新 production_candidate |
| 2026-06-25 | BDGS 完成 · Health Score 62 |
| 2026-06-25 | Founder 核准 Sprint 3 · Data Freeze 解除 · `sprint-3` 骨架 |
| 2026-06-25 | Founder 核准 Promotion · `backfill:promote` · Sprint 4 啟動 |
| 2026-06-25 | Sprint 4 ONR audit · 火鍋無官方營養頁 · Sprint 5 啟動 |
| _TBD_ | Sprint 2 QA 完成 → Founder Review |
| _TBD_ | Sprint 1 Promotion → Runtime |

---

**當前狀態：** Sprint 2 進行中 · Sprint 1 待 Promotion 核准 · 目標不是最快，是每一批都 Production Ready。
