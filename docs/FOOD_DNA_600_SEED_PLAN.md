# Food DNA — 600 建庫種子計畫

**目標：** v1 完成 **12,000** 道乾淨品項（600 來源 × 平均 20 道）  
**禁止：** 假精準、AI 直寫、單一來源 A 級

---

## 優先順序

| 階段 | 範圍 | 品項目標 | 時間建議 |
|------|------|--------:|----------|
| **P0** | 便利商店、速食、飲料、便當、健康餐、早餐 | ~6,000 | 第一波 |
| **P1** | 火鍋、日式、韓式、百貨美食街 | ~4,000 | 第二波 |
| **P2** | 夜市、在地名店、非連鎖 | ~2,000 | 第三波 |

每家 **Top 10–30** 高頻品項，不追求完整菜單。

---

## 輸出檔案規格

### JSON Schema

`data/food-kb/food-dna-seed-item.schema.json`

### CSV 欄位（與 schema 對齊）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `restaurant_id` | string | 穩定 slug |
| `canonical_restaurant_name` | string | 標準店名 |
| `aliases` | string | 以 `\|` 分隔 |
| `source_type` | enum | 20 類餐廳類型 |
| `location_context` | string | 百貨/夜市場域（可空） |
| `menu_item_name` | string | 菜單原名 |
| `canonical_food_name` | string | 標準品名 |
| `category` | string | breakfast/lunch/dinner/drink/… |
| `kcal` | number | 熱量 |
| `protein_g` | number | 蛋白質 |
| `carbs_g` | number | 碳水 |
| `fat_g` | number | 脂肪 |
| `fiber_g` | number | 纖維 |
| `sodium_mg` | number | 鈉 |
| `portion_size` | number | 份量數值 |
| `portion_unit` | string | 份/碗/杯/顆… |
| `diet_score` | 0–100 | BetterBit 推薦分 |
| `satiety_score` | 0–100 | 飽足分 |
| `protein_density` | number | g/100kcal |
| `calorie_density` | number | kcal/portion |
| `portion_risk` | low/medium/high | |
| `sauce_risk` | low/medium/high | |
| `fried_risk` | low/medium/high | |
| `sugar_risk` | low/medium/high | |
| `nutrition_source_type` | enum | official/barcode/… |
| `accuracy_level` | A/B/C/D | |
| `requires_confirmation` | boolean | |
| `high_risk_tags` | string | `\|` 分隔 |
| `add_on_options` | string | add-on id 列表 |
| `substitution_options` | string | substitution id 列表 |
| `verification_sources` | string | `\|` 分隔 |
| `last_verified_at` | ISO8601 | |
| `needs_manual_review` | boolean | |
| `seed_priority` | P0/P1/P2 | |
| `quarantine_exempt` | boolean | allowlist 內 true |

> 注意：CSV 中 `source_type` 為**餐廳類型**；`nutrition_source_type` 為**營養資料來源**（對應 Accuracy Engine）。

---

## 範例列（JSON）

```json
{
  "restaurant_id": "marugame-tw",
  "canonical_restaurant_name": "丸龜製麵",
  "aliases": ["丸龟制面"],
  "source_type": "japanese",
  "location_context": "台北101美食街",
  "menu_item_name": "牛肉烏龍麵",
  "canonical_food_name": "牛肉烏龍麵",
  "category": "lunch",
  "kcal": 580,
  "protein_g": 22,
  "carbs_g": 78,
  "fat_g": 16,
  "fiber_g": 3,
  "sodium_mg": 1400,
  "portion_size": 1,
  "portion_unit": "碗",
  "diet_score": 62,
  "satiety_score": 58,
  "protein_density": 3.8,
  "calorie_density": 580,
  "portion_risk": "medium",
  "sauce_risk": "medium",
  "fried_risk": "low",
  "sugar_risk": "low",
  "nutrition_source_type": "verified_brand_menu",
  "accuracy_level": "B",
  "requires_confirmation": false,
  "high_risk_tags": [],
  "add_on_options": [],
  "substitution_options": ["sauce_less"],
  "verification_sources": ["official_website", "foodpanda"],
  "last_verified_at": "2026-06-24T00:00:00.000Z",
  "needs_manual_review": false,
  "seed_priority": "P1",
  "quarantine_exempt": true
}
```

---

## 範例列（便利商店 — P0 A/B）

```json
{
  "restaurant_id": "7-11-tw",
  "canonical_restaurant_name": "7-11",
  "menu_item_name": "茶葉蛋",
  "canonical_food_name": "茶葉蛋",
  "source_type": "convenience_store",
  "kcal": 75,
  "protein_g": 6,
  "carbs_g": 1,
  "fat_g": 5,
  "fiber_g": 0,
  "sodium_mg": 280,
  "portion_size": 1,
  "portion_unit": "顆",
  "nutrition_source_type": "betterbit_template",
  "accuracy_level": "B",
  "requires_confirmation": false,
  "seed_priority": "P0",
  "quarantine_exempt": true
}
```

---

## 範例列（便當 — 高風險 C）

```json
{
  "restaurant_id": "local-bento",
  "canonical_restaurant_name": "便當店",
  "menu_item_name": "炸雞腿便當",
  "canonical_food_name": "炸雞腿便當",
  "source_type": "bento_shop",
  "kcal": 780,
  "protein_g": 32,
  "carbs_g": 85,
  "fat_g": 34,
  "portion_risk": "high",
  "fried_risk": "high",
  "nutrition_source_type": "betterbit_template",
  "accuracy_level": "C",
  "requires_confirmation": true,
  "high_risk_tags": ["bento", "combo_meal"],
  "add_on_options": ["less_rice", "half_rice", "extra_egg"],
  "substitution_options": ["skin_removed", "no_fry", "grill_instead"],
  "seed_priority": "P0"
}
```

---

## 建庫流程

```
allowlist 600 來源
    ↓
每店 Top 10–30 SKU 清單
    ↓
多來源驗證（≥1 強來源或 2 弱來源）
    ↓
寫入 Food DNA 種子（JSON/CSV）
    ↓
accuracy_level 分級
    ↓
匯入 menu corpus（需 Founder 核准，非本階段）
```

---

## 與 Accuracy Engine 對接

| accuracy | 行為 |
|----------|------|
| **A** | 可快速加入 food_logs |
| **B** | 可快速加入（BetterBit 模板/品牌菜單） |
| **C** | 必須 1 秒確認 |
| **D** | 不可直接入帳；僅候選 |

管道函數：

1. `classifyMealScene()`
2. `generateFoodCandidates()`
3. `applyFoodDNATemplate()`
4. `estimatePortionAdjustments()`
5. `requireUserConfirmation()`
6. `finalizeNutritionEstimate()`

---

## 驗證規則（入庫門檻）

| accuracy | 最低要求 |
|----------|----------|
| A | 官方營養表 OR 條碼 OR 品牌 verified + 1 輔助來源 |
| B | BetterBit 模板 + 外送/地圖菜單交叉 |
| C | 模板 + 使用者確認流程 |
| D | 僅 AI / 單一弱來源 — **不入庫為推薦品項** |

---

## 相關檔案

- `docs/FOOD_DNA_600_RESTAURANT_STRATEGY.md`
- `data/food-kb/food-source-allowlist.json`
- `src/lib/nutrition/food-dna-catalog.ts`
- `src/lib/nutrition/accuracy-engine.ts`
- `src/lib/nutrition/add-ons.ts`

**下一階段（需 Founder 核准）：** 產出 `food_dna_seed_v1.csv` 實際 12k 行 + 匯入腳本（不覆蓋 production）。
