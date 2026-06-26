# Menu Backfill Acceptance Report

Generated: 2026-06-26T15:47:34.884Z

> Zero Hallucination Policy — staging data only. Runtime D blocked; C search-only.

## 1. Restaurant Coverage

- Allowlist total: **600**
- Runtime with menu: **150**
- Staging restaurants: **113**
- Still missing: **450**

## 2. Menu Coverage

- Runtime items: **6407**
- Staging items: **133**
- Runtime recommendable (A/B): **279**
- Staging production candidates: **0**

## 3. Nutrition Coverage

| Field | Coverage |
|-------|----------|
| Calories | 100% |
| Protein | 100% |
| Fat | 100% |
| Carbs | 100% |
| Fiber | 0% |
| Sugar | 18% |
| Sodium | 0% |

## 4. Verification Coverage

- Restaurants with 2+ sources: **113**
- Items with traceable source: **133**
- Pending conflict review: **0**

## 5. Duplicate Report (top)

- **吉野家** / 牛丼: 牛丼（中） · 牛丼（中） · 牛丼（小） · 牛丼（中） · 牛丼（中） · 牛丼（小）
- **東池飯包** / 飯包: 招牌飯包 · 飯包（排骨） · 飯包（雞腿） · 飯包（滷肉） · 飯包（鯖魚）
- **Subway** / 火雞胸潛艇堡: 火雞胸潛艇堡（6吋） · 火雞胸潛艇堡（6吋·全麥·不加醬） · 火雞胸潛艇堡（12吋·全麥·不加醬） · 火雞胸潛艇堡（6吋·全麥）
- **八方雲集** / 鍋貼套餐: 鍋貼套餐（10顆+酸辣湯） · 鍋貼套餐（15顆+玉米湯） · 鍋貼套餐（10顆+酸辣湯） · 鍋貼套餐（15顆+玉米湯）
- **瓦城** / 打拋豬肉片套餐: 打拋豬肉片套餐 · 打拋豬肉片套餐 · 打拋豬肉片套餐 · 打拋豬肉片套餐
- **迷客夏** / 紅茶拿鐵: 紅茶拿鐵 · 紅茶拿鐵（大杯） · 紅茶拿鐵（中杯） · 紅茶拿鐵（小杯）
- **迷客夏** / 鮮奶茶: 鮮奶茶 · 鮮奶茶（大杯） · 鮮奶茶（中杯） · 鮮奶茶（小杯）
- **麥當勞** / 大麥克: 大麥克 · 大麥克 · 大麥克
- **麥當勞** / 麥克雞塊: 麥克雞塊（6塊） · 麥克雞塊 · 麥克雞塊（6塊）
- **麥當勞** / 勁辣雞腿堡: 勁辣雞腿堡（單點） · 勁辣雞腿堡 · 勁辣雞腿堡
- **摩斯漢堡** / 海洋堡: 海洋堡 · 海洋堡 · 海洋堡
- **摩斯漢堡** / 摩斯漢堡: 摩斯漢堡（單點） · 摩斯漢堡 · 摩斯漢堡
- **星巴克** / 雞肉沙拉三明治: 雞肉沙拉三明治 · 雞肉沙拉三明治 · 雞肉沙拉三明治
- **Subway** / 烤雞沙拉潛艇堡: 烤雞沙拉潛艇堡（6吋） · 烤雞沙拉潛艇堡 · 烤雞沙拉潛艇堡
- **Subway** / 照燒雞胸潛艇堡: 照燒雞胸潛艇堡 · 照燒雞胸潛艇堡（6吋·全麥·不加醬） · 照燒雞胸潛艇堡（6吋）

## 6. Conflict Report (top)

_No staging conflicts recorded._

## 7. Confidence Distribution (runtime core)

| Grade | Count | Policy |
|-------|------:|--------|
| A | 256 | Recommend |
| B | 23 | Recommend |
| C | 6 | Search only |
| D | 6122 | Blocked |

## 8. Missing Restaurant Report

Total missing: **450**

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

## 9. Missing Menu Report

- 美廉社: 0/20 items
- 合點壽司: 0/20 items
- 金子半之助: 0/20 items
- 燒肉同話: 0/20 items
- 胡同燒肉: 0/20 items
- 這一鍋: 0/20 items
- 馬辣: 0/20 items
- 辛殿麻辣鍋: 0/20 items
- 鼎王: 0/20 items
- 無老鍋: 0/20 items
- 老四川: 0/20 items
- 王品牛排: 0/20 items
- 原燒: 0/20 items
- 藝奇: 0/20 items
- 品田牧場: 0/20 items

## 10. Runtime Ready Report

- Restaurants ready (A/B items): **57**
- Items ready for recommendation: **279**
- D blocked from runtime: **6122**
- C search-only: **6**

---

**Status: D-grade blocked at runtime. Staging backfill in progress — no production writes until per-restaurant QA passes.**