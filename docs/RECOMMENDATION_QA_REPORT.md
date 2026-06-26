# BetterBit Recommendation QA Report

Generated: 2026-06-26T09:23:48.820Z

> **Offline QA only** — does not modify Production or runtime database.
> Awaiting Founder approval before any data or recommendation policy changes.

## Executive Summary

| Dimension | Result |
|-----------|--------|
| Restaurant coverage (600 allowlist) | 150/600 (25%) |
| Menu items audited (core) | 6407 |
| Recommendable items (confidence A/B) | 279 |
| Nutrition outliers | 3108 |
| Placeholder / template menus | 5231 |
| Recommendation sample pass rate | 75% |
| Explainability pass rate | 75% |

## ① Restaurant Exists

- Allowlist restaurants: **600**
- With at least one menu item: **150**
- Without menu: **450**

Proxy: allowlist + registry match (offline). Live Google Maps / Uber Eats verification is a separate pipeline step.

## ② Menu Exists

- Items audited: 6407
- Placeholder/template flagged: 5231
- Incomplete nutrition: 0

## ③ Nutrition Validation

| Field | Coverage / Pass |
|-------|-----------------|
| Calories complete | 100% |
| Protein complete | 100% |
| Fat complete | 100% |
| Carbs complete | 100% |
| Fiber | 0% (not in core menu schema) |
| Sugar | 0% (not in core menu schema) |
| Sodium | 0% (not in core menu schema) |
| Energy balance (4P+4C+9F) | 87.6% |

Source priority: official > USDA/TFDA > brand public > Food DNA > estimated pending. No averaging across tiers.

## ④ Portion Validation

Portion/macro plausibility pass: **80.3%**

## ⑤ Macro Validation

Within dish-type bands: **57%**
Nutrition outliers flagged: **3108**

## ⑥ Recommendation Validation

Scenarios sampled: 4
Pass rate: 75%
Confidence A/B: 75%

### Sample results

### protein_gap_high (lunch)
- Valid: ✅
- Confidence: **A**
- Recommendable: yes
- Explainability: ✅
- Why: 今天蛋白質還少約 102g，所以推薦高蛋白組合 推薦：京站美食街 · 雞腿便當 此餐 +32g 蛋白質、+620 kcal，脂肪 20g、碳水 72g。 營養來源：品牌公開（京站美食街 品牌公開資料） · 1 來源 · confidence A
- Issues: none

### fat_near_limit (dinner)
- Valid: ✅
- Confidence: **A**
- Recommendable: yes
- Explainability: ✅
- Why: 今天蛋白質還少約 60g，所以推薦高蛋白組合 推薦：金仙滷肉飯 · 雞腿飯 此餐 +36g 蛋白質、+680 kcal，脂肪 24g、碳水 76g。 營養來源：品牌公開（金仙滷肉飯 品牌公開資料） · 1 來源 · confidence B
- Issues: none

### carb_near_limit (lunch)
- Valid: ✅
- Confidence: **A**
- Recommendable: yes
- Explainability: ✅
- Why: 今天蛋白質還少約 96g，所以推薦高蛋白組合 推薦：京站美食街 · 雞腿便當 此餐 +32g 蛋白質、+620 kcal，脂肪 20g、碳水 72g。 營養來源：品牌公開（京站美食街 品牌公開資料） · 1 來源 · confidence A
- Issues: none

### calories_over_target (dinner)
- Valid: ❌
- Confidence: **D**
- Recommendable: no
- Explainability: ❌

- Issues: 無法產生推薦


## ⑦ Diet / Nutrition / Restaurant Scores

Per-item scores recalculated fresh via `calculateDietScore` + `computeBetterBitFoodScore` (see JSON sample).

## ⑧ Recommendation Confidence

| Grade | Count | Policy |
|-------|-------|--------|
| A | 256 | Normal recommend |
| B | 23 | Normal recommend |
| C | 6 | Recommend with caution |
| D | 6122 | Do not recommend |

## ⑨ Explainability

Sample explainability pass: 75%

## ⑩ Top Gaps

### Top missing menus (allowlist, no items)

- 美廉社
- 合點壽司
- 金子半之助
- 燒肉同話
- 胡同燒肉
- 這一鍋
- 馬辣
- 辛殿麻辣鍋
- 鼎王
- 無老鍋
- 老四川
- 王品牛排
- 原燒
- 藝奇
- 品田牧場
- 青花驕
- 尬鍋
- 1010湘
- 時時香
- 開飯川食堂
- 金色三麥
- 怡客咖啡
- Mister Donut
- Krispy Kreme
- Dunkin'

### Top nutrition outliers

- `sprint1-7-11-lunch-1` @ 7-11 — 泰式酸辣雞腿冷麵: 超出 noodles 合理區間
- `sprint1-7-11-lunch-5` @ 7-11 — 麻油雞飯: 超出 rice_bowl 合理區間
- `sprint1-7-11-lunch-7` @ 7-11 — 爆蛋肉燥新極大飯: 超出 rice_bowl 合理區間
- `sprint1-7-11-lunch-10` @ 7-11 — 米香鹹酥蝦飯: 超出 rice_bowl 合理區間
- `sprint1-7-11-lunch-11` @ 7-11 — 晶英三杯蛤蜊飯: 超出 rice_bowl 合理區間
- `sprint1-7-11-lunch-12` @ 7-11 — 晶英韓式炸豬排起司雙拼飯: 超出 fried 合理區間
- `sprint1-7-11-lunch-13` @ 7-11 — 麻辣奶油鮮蝦義大利麵: 超出 noodles 合理區間
- `sprint1-7-11-breakfast-14` @ 7-11 — 御飯糰-梅子紫蘇: 超出 rice_bowl 合理區間
- `sprint1-7-11-breakfast-15` @ 7-11 — 御飯糰-鮭魚: 超出 rice_bowl 合理區間
- `sprint1-7-11-breakfast-16` @ 7-11 — 御飯糰-鮪魚起司: 超出 rice_bowl 合理區間
- `sprint1-7-11-breakfast-19` @ 7-11 — 7-11茶葉蛋: 超出 generic 合理區間
- `sprint1-7-11-breakfast-20` @ 7-11 — 豆漿早餐組合: 超出 drink 合理區間
- `sprint1-7-11-dinner-21` @ 7-11 — 台韓半半炸雞便當: 超出 fried 合理區間
- `sprint1-family-lunch-1` @ 全家 — 泰式酸辣雞腿冷麵: 超出 noodles 合理區間
- `sprint1-family-lunch-5` @ 全家 — 麻油雞飯: 超出 rice_bowl 合理區間
- `sprint1-family-lunch-7` @ 全家 — 爆蛋肉燥新極大飯: 超出 rice_bowl 合理區間
- `sprint1-family-lunch-10` @ 全家 — 米香鹹酥蝦飯: 超出 rice_bowl 合理區間
- `sprint1-family-lunch-11` @ 全家 — 晶英三杯蛤蜊飯: 超出 rice_bowl 合理區間
- `sprint1-family-lunch-12` @ 全家 — 晶英韓式炸豬排起司雙拼飯: 超出 fried 合理區間
- `sprint1-family-lunch-13` @ 全家 — 麻辣奶油鮮蝦義大利麵: 超出 noodles 合理區間
- `sprint1-family-breakfast-14` @ 全家 — 御飯糰-梅子紫蘇: 超出 rice_bowl 合理區間
- `sprint1-family-breakfast-15` @ 全家 — 御飯糰-鮭魚: 超出 rice_bowl 合理區間
- `sprint1-family-breakfast-16` @ 全家 — 御飯糰-鮪魚起司: 超出 rice_bowl 合理區間
- `sprint1-family-breakfast-19` @ 全家 — 7-11茶葉蛋: 超出 generic 合理區間
- `sprint1-family-breakfast-20` @ 全家 — 豆漿早餐組合: 超出 drink 合理區間

---

**Status: QA complete — awaiting Founder approval before production changes.**