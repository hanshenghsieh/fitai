# Food Source Allowlist (600)

**Generated:** 2026-06-24T16:27:21.594Z  
**Policy:** `quarantine_exempt: true` — 此清單內品牌 **不得 quarantine**

---

## Summary

| Metric | Value |
|--------|------:|
| 清單項目 | 600 |
| P0（1–300 連鎖/通路） | 300 |
| P1（301–600 精選/名店/夜市） | 300 |
| 唯一 canonical 品牌 | 577 |
| P0 信心 A 級 | 230 |
| P1 信心 B 級（需交叉驗證） | 300 |

### P1 種子規則

- `seed_priority = P1`
- `needs_cross_validation = true`
- `source_type = mixed`
- `quarantine_exempt = true`（仍不得隔離）

### 依 source_type

| source_type | 數量 |
|-------------|-----:|
| mixed | 300 |
| chain_restaurant | 152 |
| local_restaurant | 27 |
| delivery_only | 23 |
| drink_shop | 22 |
| night_market | 20 |
| mall_food_court | 20 |
| cafe | 16 |
| street_food | 10 |
| convenience_store | 5 |
| supermarket | 5 |

---

## 欄位說明

| 欄位 | 說明 |
|------|------|
| canonical_name | 標準品牌名（合併別名後） |
| source_type | P0 依類型；P1 固定 `mixed` |
| menu_clusters | 常見菜單群組 |
| search_aliases | 搜尋別名 |
| confidence_level | A（P0 多數）/ B（P1 全數） |
| seed_priority | P0 / P1 |
| needs_cross_validation | P1 = true |
| quarantine_exempt | 固定 true |

---

## 檔案

- `data/food-kb/food-source-allowlist.json`
- `food_source_allowlist.csv`
- `src/lib/food-kb/top300-allowlist.ts` — `isQuarantineExempt()` / `needsCrossValidation()`

---

## P1 精選（301–320 預覽）

| # | canonical | clusters |
|---|-----------|----------|
| 301 | 米其林餐盤餐廳 | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 302 | 山海樓 | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 303 | 富錦樹台菜香檳 | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 304 | 雙月食品社 | 招牌菜, 主食, 小菜, 湯品, 飲料 |
| 305 | 小王煮瓜 | 招牌菜, 主食, 小菜, 湯品, 飲料 |
| 306 | 侯布雄法式餐廳 | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 307 | RAW | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 308 | MUME | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 309 | Longtail | 招牌菜, 主食, 小菜, 湯品, 飲料 |
| 310 | Tairroir 態芮 | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 311 | JL Studio | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 312 | 鹽之華 | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 313 | Forchetta | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 314 | The Tavernist | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 315 | Logy | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 316 | Impromptu by Paul Lee | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 317 | Molino de Urdániz | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 318 | Orchid 蘭 | 品嚐菜單, 主餐, 前菜, 甜點, 酒單 |
| 319 | 明福台菜海產 | 招牌菜, 主食, 小菜, 湯品, 飲料 |
| 320 | 頤宮 | 招牌菜, 主食, 小菜, 湯品, 飲料 |

---

## 完整清單

見 `food_source_allowlist.csv`（600 rows）
