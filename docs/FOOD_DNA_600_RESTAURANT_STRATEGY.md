# Food DNA — 600 餐廳 / 食物來源策略

**角色：** BetterBit Nutrition Accuracy  
**原則：** 寧願少一點，也不要錯。使用者只在乎準不準，不在乎資料從哪來。  
**狀態：** 規劃 + 引擎已建（未動 production）

---

## 1. 600 間來源如何分級

| 層級 | 說明 | 數量 | 範例 |
|------|------|-----:|------|
| **P0** | 高頻、可驗證、減脂核心 | 300 | 便利商店、速食、飲料、便當、健康餐、早餐 |
| **P1** | 需交叉驗證、模板化 | 300 | 米其林/名店、火鍋、燒肉、在地小吃 |
| **保護** | allowlist 不得 quarantine | 600 | `food-source-allowlist.json` |

每一筆來源標記：

- `seed_priority`: P0 / P1 / P2
- `needs_cross_validation`: P1 為 true
- `accuracy_level`: A–D（見 Accuracy Engine）
- `quarantine_exempt`: allowlist 內為 true

---

## 2. 每一類應抓多少品項

| 類型 | 長期目標 / 店 | v1 先抓 | 備註 |
|------|-------------|--------|------|
| 便利商店 / 超市 | 200–800 | **100–200** | 高頻 SKU 優先 |
| 速食 | 30–80 | **30–50** | 官方營養表 |
| 飲料店 | 30–100 | **30–60** | 糖度/冰量/加料矩陣 |
| 咖啡店 | 20–50 | **20–30** | 品項 + 糖漿 |
| 便當 / 健康餐 | 20–60 | **20–40** | 主菜 + 飯量變體 |
| 早餐店 | 30–80 | **30–50** | 蛋餅/鐵板/飲料 |
| 火鍋 / 燒肉 | 拆分量 | **15–30 模板** | 不抓套餐死算 |
| 日式 / 韓式 / 麵店 | 20–40 | **15–25** | 主餐 + 湯麵 |
| 滷味 / 鹽酥雞 / 夜市 | 單品模板 | **10–20 模板** | 份量確認 |
| 百貨美食街 | 依品牌 | **Top 品牌各 10–20** | location 與品牌分離 |
| 在地 / 非連鎖 | 5–15 | **5–10 名店** | 人工驗證優先 |

**v1 總目標：** 12,000 道乾淨資料（600 店 × 平均 20 品項）

---

## 3. 哪些品項優先（減脂 P0）

### 便利商店 / 超市必抓

茶葉蛋、雞胸肉、無糖豆漿、高蛋白牛奶、地瓜、飯糰、沙拉、毛豆、優格、鮪魚罐頭、香蕉、全麥吐司、便當、御飯糰、雞肉沙拉

### 全類共通優先

1. 官方有營養標示的 SKU  
2. 外送平台有完整品項 + 規格  
3. 使用者記錄頻率 Top N（Food DNA frequent）  
4. `betterbit_food_score` diet_score ≥ B 的品項  

---

## 4. 哪些品項不要一開始抓

- 吃到飽、自助餐全品項（僅模板 + 確認流程）
- 無法驗證來源的「季節限定」單品
- 僅 AI 照片推斷、無模板的品項
- 醬料/加料組合爆炸（先抓矩陣，不抓全排列）
- 同一品牌重複別名未合併的品項
- `accuracy_level = D` 且無使用者確認路徑

---

## 5. 副餐、加點、飲料、醬料邏輯

**禁止：** 把「套餐」當單一不可分解品項。

建立 **add-on system**（見 `src/lib/nutrition/add-ons.ts`）：

| 類型 | 處理方式 |
|------|----------|
| 副餐（茶葉蛋、地瓜…） | 獨立 SKU，`kcal_delta` 等 |
| 加點（加蛋、加肉、加飯） | modifier delta |
| 替換（少飯、飯換菜、無糖） | substitution delta |
| 醬料 | `sauce_level` 確認題 + delta |
| 飲料糖度 | `drink_sugar` 確認題 + delta |

套餐 = 主餐模板 + 可選副餐/飲料 + 使用者確認。

---

## 6. 如何建立 Food DNA

每道菜（或模板）必含：

```
protein_g, kcal, carbs_g, fat_g, fiber_g, sodium_mg
satiety_score, diet_score
protein_density, calorie_density
portion_risk, sauce_risk, fried_risk, sugar_risk
confidence_level → accuracy_level (A–D)
source_type (official | barcode | verified_brand_menu | betterbit_template | …)
requires_confirmation, high_risk_tags
add_on_options[], substitution_options[]
```

實作：

- 模板庫：`src/lib/nutrition/food-dna-catalog.ts`
- 評分：`src/lib/betterbit-food-score.ts`
- 管道：`src/lib/nutrition/accuracy-engine.ts`

---

## 7. 如何避免資料髒掉

1. **不得單一來源入庫為 A** — 至少 2 類驗證來源或人工確認  
2. **別名合併** — canonical_food_name + aliases  
3. **百貨 ≠ 餐廳** — `location_context` 與 `restaurant_id` 分離  
4. **D 級不可推薦** — 不可進正式 dice/suggest  
5. **AI 照片永不直寫 kcal** — 必須走確認管道  
6. **定期審計** — Truth Audit + False Negative Audit（已完成 Phase 1）  
7. **manual_review 佇列** — `needs_manual_review` 標記  

---

## 8. 交叉驗證真實存在

沿用 Food Source Truth 方法：

- brand-registry / allowlist  
- 官方網站 / PDF 營養  
- 條碼 (TFDA / Open Food Facts)  
- Uber Eats / foodpanda 菜單  
- Google Maps + 菜單圖 OCR  
- 新聞 / 部落格（僅輔助，不可單獨 A）  

餐廳存在性 → allowlist + Truth Score  
品項營養 → Accuracy Level A/B/C/D  

---

## 9. 如何避免 AI 假精準

| 禁止 | 改為 |
|------|------|
| 照片 → 850 kcal 直接入帳 | 候選 1–3 + 確認 |
| 顯示單一精準數字 | 顯示「可能是…」+ 調整後數值 |
| AI confidence high 就 A | AI 最高 C，通常 D |
| 便當/火鍋自動記錄 | 強制 1–2 題確認 |

引擎規則：`source_type = ai_photo_only` → `accuracy_level = D`，`ready_for_food_log = false` 直到 `user_confirmed: true`。

---

## 10. 如何服務減脂使用者

1. **diet_score 驅動推薦** — 高蛋白、低油炸、高飽足優先  
2. **預設保護高風險** — 便當/炸物/含糖飲必問  
3. **快速通道僅 A/B** — 茶葉蛋、雞胸、健康餐盒  
4. **add-on 引導** — 建議加茶葉蛋、少飯、無糖  
5. **不羞辱、不債務語言** — 確認題 1–2 個，一秒可點  

---

## 20 類來源差異化策略（摘要）

| # | 類型 | 策略重點 |
|---|------|----------|
| 1 | 便利商店 | 條碼 + 官方 SKU，A/B |
| 2 | 超市 | 條碼優先，熟食模板 |
| 3 | 量販店 | 同超市，大份量 risk=high |
| 4 | 速食 | 官方營養表，套餐拆解 |
| 5 | 飲料店 | 糖度/冰量/加料矩陣 |
| 6 | 咖啡店 | 品項 + 糖漿/奶 |
| 7 | 便當店 | 主菜+飯量確認 |
| 8 | 早餐店 | 蛋餅加料、醬量 |
| 9 | 火鍋 | 肉/菜/湯底/醬料拆分 |
| 10 | 燒肉 | 肉盤份量 + 醬料 |
| 11 | 日式 | 定食/丼飯/拉麵分模板 |
| 12 | 韓式 | 烤肉 + 小菜 |
| 13 | 麵店 | 湯麵鈉含量標記 |
| 14 | 滷味 | 單品模板 + 份量 |
| 15 | 鹽酥雞 | 炸物 risk + 份量 |
| 16 | 夜市 | 不自動估算，模板+份 |
| 17 | 百貨美食街 | location_context |
| 18 | 健康餐盒 | 外送 corpus + B |
| 19 | 在地小吃 | P1 交叉驗證 |
| 20 | 非連鎖 | 人工確認優先 |

---

## 相關檔案

- `data/food-kb/food-source-allowlist.json` — 600 保護來源  
- `src/lib/nutrition/accuracy-engine.ts` — 準確度管道  
- `src/lib/nutrition/add-ons.ts` — 加點系統  
- `docs/FOOD_DNA_600_SEED_PLAN.md` — 建庫計畫  
- `data/food-kb/food-dna-seed-item.schema.json` — 種子 schema  
