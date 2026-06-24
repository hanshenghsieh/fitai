# Food Source Truth Audit

**Generated:** 2026-06-24T16:18:18.965Z  
**Method:** Offline cross-reference (menu corpus + brand registry + xval-report)  
**Status:** Review only — **no production data modified**

---

## Philosophy

寧願慢，不要假。寧願少一點，不要髒資料。

本報告為 **Phase 1 離線審計**。分數來自：
- `brand-registry.ts` 官方品牌清單
- `xval-report.json` 既有交叉驗證
- 菜單 corpus（final-menu + chains + expanded + seeds）
- 保護清單（便利商店 / 超市 / 百貨 / 夜市）

**Phase 2（Founder 核准後）：** Google Maps / 外送平台 API 即時驗證。

---

## Summary

| Metric | Count |
|--------|------:|
| 原始資料總數（唯一店家/品牌） | 275 |
| 菜單品項總數 | 6400 |
| **A 級** (≥80) | 171 |
| **B 級** (60–79) | 17 |
| **C 級** (40–59) | 23 |
| **D 級** (<40) | 63 |
| delete_candidate | 1 |
| quarantine | 63 |
| merge | 3 |
| 需人工審核 | 23 |

---

## Truth Score Rules (Applied)

| Signal | Points |
|--------|--------|
| brand_registry 命中 | +20 |
| official_website (registry) | +30 |
| official_website (xval) | +30 |
| google_maps_proxy (registry priority) | +20~30 |
| delivery_platform | +20 |
| social_official_proxy | +15 |
| mall_official_proxy | +20 |
| blog/news (xval) | +10 |
| searchable_name | +10 |
| menu_exists (≥3 items) | +10 |
| name_consistent | +10 |
| protected_anchor floor | min 85 |

---

## Trust Levels

- **A (≥80):** 可直接保留
- **B (60–79):** 保留，confidence=medium
- **C (40–59):** 暫留但不優先推薦
- **D (<40):** quarantine，不進正式推薦

---

## Protected Categories Status

### 便利商店
- 7-11: ✓ score 100 (keep)
- 7-ELEVEN: ✗ not found
- 全家: ✓ score 100 (keep)
- 萊爾富: ✓ score 95 (keep)
- OK超商: ✓ score 95 (keep)
- OK mart: ✗ not found
- OK Mart: ✗ not found
- 美廉社: ✗ not found

### 超市
- 全聯: ✓ score 95 (keep)
- 家樂福: ✓ score 95 (keep)
- 愛買: ✓ score 95 (keep)
- Costco: ✓ score 95 (keep)
- 大潤發: ✓ score 95 (keep)
- Mia C'bon: ✓ score 85 (keep)
- Jason's: ✓ score 85 (keep)

### 百貨美食街（關鍵字）
- 新光三越: ✓ in corpus
- SOGO: ✓ in corpus
- 遠東SOGO: — not as store name (expected)
- 微風: ✓ in corpus
- 台北101: — not as store name (expected)
- 台北 101: — not as store name (expected)
- 誠品: ✓ in corpus
- 誠品生活: ✓ in corpus
- 遠百: — not as store name (expected)
- 環球購物中心: — not as store name (expected)
- 環球: — not as store name (expected)
- 南紡: — not as store name (expected)
- 夢時代: — not as store name (expected)
- LaLaport: — not as store name (expected)
- lalaport: — not as store name (expected)

### 夜市
- 台灣夜市: score 95 · keep

---

## 森度餐廚（個案）

| Field | Value |
|-------|-------|
| original_name | 森度餐廚 |
| truth_score | 85 |
| confidence | A |
| keep_status | keep |
| source_type | chain_restaurant |
| item_count | 12 |
| verification | xval_validated|delivery_platform|searchable_name|menu_exists|top300_allowlist |

**結論：** 在 runtime 菜單中存在，但 **不在 brand-registry** → 分數偏低，建議 Phase 2 用 Google Maps / Uber Eats 驗證後再決定 keep 或 quarantine。

---

## Top 200 高信任食物來源

| # | 品牌 | Score | Level | Type | Items | Keep |
|---|------|------:|-------|------|------:|------|
| 1 | 7-11 | 100 | A | convenience_store | 59 | keep |
| 2 | 三商巧福 | 100 | A | chain_restaurant | 51 | keep |
| 3 | 瓦城 | 100 | A | chain_restaurant | 49 | keep |
| 4 | 全家 | 100 | A | convenience_store | 59 | keep |
| 5 | 吉野家 | 100 | A | chain_restaurant | 39 | keep |
| 6 | 肌肉海灘 | 100 | A | chain_restaurant | 46 | keep |
| 7 | 爭鮮迴轉壽司 | 100 | A | chain_restaurant | 49 | keep |
| 8 | 肯德基 | 100 | A | chain_restaurant | 49 | keep |
| 9 | 星巴克 | 100 | A | cafe | 45 | keep |
| 10 | 健人餐廚 | 100 | A | chain_restaurant | 47 | keep |
| 11 | 麥當勞 | 100 | A | chain_restaurant | 60 | keep |
| 12 | 路易莎 | 100 | A | cafe | 46 | keep |
| 13 | 摩斯漢堡 | 100 | A | chain_restaurant | 50 | keep |
| 14 | 鬍鬚張 | 100 | A | chain_restaurant | 48 | keep |
| 15 | Subway | 100 | A | chain_restaurant | 66 | keep |
| 16 | 72度C舒肥健康餐 | 95 | A | chain_restaurant | 35 | keep |
| 17 | 85度C | 95 | A | cafe | 40 | keep |
| 18 | 一沐日 | 95 | A | drink_shop | 35 | keep |
| 19 | 一蘭 | 95 | A | chain_restaurant | 35 | keep |
| 20 | 八方雲集 | 95 | A | chain_restaurant | 40 | keep |
| 21 | 大心 | 95 | A | chain_restaurant | 35 | keep |
| 22 | 大戶屋 | 95 | A | chain_restaurant | 38 | keep |
| 23 | 大潤發 | 95 | A | supermarket | 35 | keep |
| 24 | 五十嵐 | 95 | A | drink_shop | 35 | keep |
| 25 | 可不可 | 95 | A | drink_shop | 35 | keep |
| 26 | 台灣夜市 | 95 | A | night_market | 35 | keep |
| 27 | 四海遊龍 | 95 | A | chain_restaurant | 35 | keep |
| 28 | 必勝客 | 95 | A | chain_restaurant | 40 | keep |
| 29 | 石二鍋 | 95 | A | chain_restaurant | 38 | keep |
| 30 | 全聯 | 95 | A | supermarket | 35 | keep |
| 31 | 全聯熟食 | 95 | A | supermarket | 5 | merge |
| 32 | 再睡五分鐘 | 95 | A | drink_shop | 35 | keep |
| 33 | 早安美芝城 | 95 | A | street_food | 41 | keep |
| 34 | 老乾杯 | 95 | A | chain_restaurant | 35 | keep |
| 35 | 亞尼克 | 95 | A | chain_restaurant | 40 | keep |
| 36 | 和牛涮 | 95 | A | chain_restaurant | 35 | keep |
| 37 | 林東芳 | 95 | A | chain_restaurant | 35 | keep |
| 38 | 哈根達斯 | 95 | A | chain_restaurant | 35 | keep |
| 39 | 屋馬 | 95 | A | chain_restaurant | 35 | keep |
| 40 | 段純貞 | 95 | A | chain_restaurant | 35 | keep |
| 41 | 美而美 | 95 | A | street_food | 35 | keep |
| 42 | 家樂福 | 95 | A | supermarket | 35 | keep |
| 43 | 悟饕池上便當 | 95 | A | chain_restaurant | 35 | keep |
| 44 | 海底撈 | 95 | A | chain_restaurant | 35 | keep |
| 45 | 涓豆腐 | 95 | A | chain_restaurant | 35 | keep |
| 46 | 迷客夏 | 95 | A | drink_shop | 40 | keep |
| 47 | 乾杯 | 95 | A | chain_restaurant | 35 | keep |
| 48 | 梁社漢排骨 | 95 | A | chain_restaurant | 35 | keep |
| 49 | 清心福全 | 95 | A | drink_shop | 37 | keep |
| 50 | 麥味登 | 95 | A | street_food | 43 | keep |
| 51 | 麻古茶坊 | 95 | A | drink_shop | 35 | keep |
| 52 | 勝博殿 | 95 | A | chain_restaurant | 38 | keep |
| 53 | 萊爾富 | 95 | A | convenience_store | 35 | keep |
| 54 | 貳樓 | 95 | A | chain_restaurant | 35 | keep |
| 55 | 愛買 | 95 | A | supermarket | 35 | keep |
| 56 | 達美樂 | 95 | A | chain_restaurant | 40 | keep |
| 57 | 壽司郎 | 95 | A | chain_restaurant | 39 | keep |
| 58 | 漢堡王 | 95 | A | chain_restaurant | 35 | keep |
| 59 | 樂子 | 95 | A | chain_restaurant | 35 | keep |
| 60 | 燒肉LIKE | 95 | A | chain_restaurant | 35 | keep |
| 61 | 築間 | 95 | A | chain_restaurant | 35 | keep |
| 62 | 藏壽司 | 95 | A | chain_restaurant | 35 | keep |
| 63 | cama | 95 | A | cafe | 37 | keep |
| 64 | CoCo都可 | 95 | A | drink_shop | 35 | keep |
| 65 | CoCo壹番屋 | 95 | A | chain_restaurant | 35 | keep |
| 66 | COLD STONE | 95 | A | chain_restaurant | 35 | keep |
| 67 | Costco | 95 | A | supermarket | 40 | keep |
| 68 | OK超商 | 95 | A | convenience_store | 35 | keep |
| 69 | SUKIYA | 95 | A | chain_restaurant | 37 | keep |
| 70 | Texas Roadhouse | 95 | A | chain_restaurant | 35 | keep |
| 71 | 12MINI | 92 | A | chain_restaurant | 3 | keep |
| 72 | 50嵐 | 92 | A | chain_restaurant | 2 | keep |
| 73 | 丸龜製麵 | 92 | A | chain_restaurant | 5 | keep |
| 74 | 千葉火鍋 | 92 | A | chain_restaurant | 35 | keep |
| 75 | 大苑子 | 92 | A | drink_shop | 35 | keep |
| 76 | 小蒙牛 | 92 | A | chain_restaurant | 35 | keep |
| 77 | 山頭火 | 92 | A | chain_restaurant | 35 | keep |
| 78 | 丹丹漢堡 | 92 | A | chain_restaurant | 3 | keep |
| 79 | 丹堤咖啡 | 92 | A | cafe | 35 | keep |
| 80 | 屯京拉麵 | 92 | A | chain_restaurant | 35 | keep |
| 81 | 台鐵便當 | 92 | A | chain_restaurant | 3 | keep |
| 82 | 弘爺漢堡 | 92 | A | street_food | 38 | keep |
| 83 | 必艾客 | 92 | A | chain_restaurant | 5 | keep |
| 84 | 正忠排骨飯 | 92 | A | chain_restaurant | 35 | keep |
| 85 | 好市多熟食 | 92 | A | chain_restaurant | 5 | keep |
| 86 | 池上木片便當 | 92 | A | chain_restaurant | 35 | keep |
| 87 | 老先覺 | 92 | A | chain_restaurant | 37 | keep |
| 88 | 老賴紅茶 | 92 | A | chain_restaurant | 5 | keep |
| 89 | 老賴茶棧 | 92 | A | drink_shop | 35 | keep |
| 90 | 肉多多 | 92 | A | chain_restaurant | 35 | keep |
| 91 | 西堤牛排 | 92 | A | chain_restaurant | 2 | keep |
| 92 | 伯朗 | 92 | A | chain_restaurant | 3 | keep |
| 93 | 伯朗咖啡 | 92 | A | cafe | 35 | keep |
| 94 | 豆腐村 | 92 | A | chain_restaurant | 35 | keep |
| 95 | 京站美食街 | 92 | A | chain_restaurant | 3 | keep |
| 96 | 拉亞漢堡 | 92 | A | street_food | 40 | keep |
| 97 | 欣葉 | 92 | A | chain_restaurant | 5 | keep |
| 98 | 爭鮮PLUS | 92 | A | chain_restaurant | 3 | keep |
| 99 | 花月嵐 | 92 | A | chain_restaurant | 35 | keep |
| 100 | 非常泰 | 92 | A | chain_restaurant | 40 | keep |
| 101 | 春水堂 | 92 | A | chain_restaurant | 5 | keep |
| 102 | 珍煮丹 | 92 | A | drink_shop | 35 | keep |
| 103 | 夏慕尼 | 92 | A | chain_restaurant | 7 | keep |
| 104 | 悟饕池上飯包 | 92 | A | chain_restaurant | 10 | keep |
| 105 | 拿坡里 | 92 | A | chain_restaurant | 40 | keep |
| 106 | 烏弄 | 92 | A | drink_shop | 35 | keep |
| 107 | 茶湯會 | 92 | A | drink_shop | 40 | keep |
| 108 | 得正 | 92 | A | drink_shop | 35 | keep |
| 109 | 晨間廚房 | 92 | A | street_food | 35 | keep |
| 110 | 梁社漢 | 92 | A | chain_restaurant | 18 | keep |
| 111 | 涮乃葉 | 92 | A | chain_restaurant | 35 | keep |
| 112 | 清心 | 92 | A | chain_restaurant | 5 | keep |
| 113 | 陶板屋 | 92 | A | chain_restaurant | 2 | keep |
| 114 | 頂呱呱 | 92 | A | chain_restaurant | 40 | keep |
| 115 | 微風廣場美食街 | 92 | A | mall_food_court | 5 | keep |
| 116 | 新光三越美食街 | 92 | A | mall_food_court | 7 | keep |
| 117 | 萬波 | 92 | A | drink_shop | 35 | keep |
| 118 | 誠品生活美食街 | 92 | A | mall_food_court | 2 | keep |
| 119 | 鼎泰豐 | 92 | A | chain_restaurant | 5 | keep |
| 120 | 漢來海港 | 92 | A | chain_restaurant | 7 | keep |
| 121 | 福勝亭 | 92 | A | chain_restaurant | 35 | keep |
| 122 | 福隆便當 | 92 | A | chain_restaurant | 5 | keep |
| 123 | 聚北海道鍋物 | 92 | A | chain_restaurant | 35 | keep |
| 124 | 樂麵屋 | 92 | A | chain_restaurant | 35 | keep |
| 125 | 錢都 | 92 | A | chain_restaurant | 35 | keep |
| 126 | 龜記 | 92 | A | drink_shop | 35 | keep |
| 127 | 韓虎嘯 | 92 | A | chain_restaurant | 5 | keep |
| 128 | 韓姜熙 | 92 | A | chain_restaurant | 35 | keep |
| 129 | 點點心 | 92 | A | chain_restaurant | 12 | keep |
| 130 | 麵屋武藏 | 92 | A | chain_restaurant | 35 | keep |
| 131 | 饗食天堂 | 92 | A | chain_restaurant | 7 | keep |
| 132 | 饗泰多 | 92 | A | chain_restaurant | 35 | keep |
| 133 | Chili's | 92 | A | chain_restaurant | 35 | keep |
| 134 | CoCo | 92 | A | chain_restaurant | 5 | keep |
| 135 | COMEBUY | 92 | A | drink_shop | 35 | keep |
| 136 | IKEA | 92 | A | chain_restaurant | 5 | keep |
| 137 | Q Burger | 92 | A | street_food | 35 | keep |
| 138 | TGI Fridays | 92 | A | chain_restaurant | 35 | keep |
| 139 | YAYOI彌生軒 | 92 | A | chain_restaurant | 35 | keep |
| 140 | 八曜和茶 | 85 | A | drink_shop | 35 | keep |
| 141 | 不二家 | 85 | A | chain_restaurant | 35 | keep |
| 142 | 天下三絕 | 85 | A | chain_restaurant | 35 | keep |
| 143 | 北村豆腐家 | 85 | A | chain_restaurant | 35 | keep |
| 144 | 多那之 | 85 | A | cafe | 35 | keep |
| 145 | 老董牛肉麵 | 85 | A | chain_restaurant | 35 | keep |
| 146 | 肉次方 | 85 | A | chain_restaurant | 35 | keep |
| 147 | 杏子豬排 | 85 | A | chain_restaurant | 35 | keep |
| 148 | 享健康 | 85 | A | chain_restaurant | 35 | keep |
| 149 | 享健康餐盒 | 85 | A | chain_restaurant | 8 | merge |
| 150 | 兩班家 | 85 | A | chain_restaurant | 35 | keep |
| 151 | 東池飯包 | 85 | A | chain_restaurant | 39 | keep |
| 152 | 松屋 | 85 | A | chain_restaurant | 35 | keep |
| 153 | 金仙滷肉飯 | 85 | A | chain_restaurant | 3 | keep |
| 154 | 皇家傳承牛肉麵 | 85 | A | chain_restaurant | 35 | keep |
| 155 | 浜壽司 | 85 | A | chain_restaurant | 35 | keep |
| 156 | 能量小姐 | 85 | A | chain_restaurant | 12 | keep |
| 157 | 茶六 | 85 | A | chain_restaurant | 35 | keep |
| 158 | 森度餐廚 | 85 | A | chain_restaurant | 12 | keep |
| 159 | 微風舒舒 | 85 | A | mall_food_court | 9 | keep |
| 160 | 德州美墨炸雞 | 85 | A | chain_restaurant | 35 | keep |
| 161 | 樂卡餐盒 | 85 | A | chain_restaurant | 35 | keep |
| 162 | 蔬方 | 85 | A | chain_restaurant | 8 | keep |
| 163 | 繼光香香雞 | 85 | A | chain_restaurant | 35 | keep |
| 164 | CAFE!N | 85 | A | cafe | 35 | keep |
| 165 | FitBox | 85 | A | chain_restaurant | 35 | keep |
| 166 | FITBOX | 85 | A | chain_restaurant | 8 | merge |
| 167 | Jason's | 85 | A | supermarket | 35 | keep |
| 168 | Magic Touch | 85 | A | chain_restaurant | 35 | keep |
| 169 | Mia C'bon | 85 | A | supermarket | 35 | keep |
| 170 | Miss Energy | 85 | A | chain_restaurant | 35 | keep |
| 171 | SOGO美食街 | 85 | A | mall_food_court | 4 | keep |
| 172 | 十二段 | 70 | B | chain_restaurant | 35 | keep |
| 173 | 五花馬 | 70 | B | chain_restaurant | 35 | keep |
| 174 | 日出茶太 | 70 | B | drink_shop | 35 | keep |
| 175 | 水巷茶弄 | 70 | B | drink_shop | 35 | keep |
| 176 | 巧之味 | 70 | B | chain_restaurant | 35 | keep |
| 177 | 先喝道 | 70 | B | drink_shop | 35 | keep |
| 178 | 成真咖啡 | 70 | B | cafe | 35 | keep |
| 179 | 早安山丘 | 70 | B | street_food | 35 | keep |
| 180 | 初米好食 | 70 | B | chain_restaurant | 35 | keep |
| 181 | 呷尚寶 | 70 | B | street_food | 35 | keep |
| 182 | 茶聚 | 70 | B | drink_shop | 35 | keep |
| 183 | 野瘦派 | 70 | B | chain_restaurant | 35 | keep |
| 184 | 野餐日 | 70 | B | chain_restaurant | 35 | keep |
| 185 | 黑沃咖啡 | 70 | B | cafe | 35 | keep |
| 186 | 燒肉Smile | 70 | B | chain_restaurant | 35 | keep |
| 187 | 鍋台銘 | 70 | B | chain_restaurant | 35 | keep |
| 188 | 鶴茶樓 | 70 | B | drink_shop | 35 | keep |
| 189 | 丼丼屋 | 55 | C | chain_restaurant | 4 | manual_review |
| 190 | 巨林美而美 | 50 | C | street_food | 35 | manual_review |
| 191 | 一日樂食 | 40 | C | chain_restaurant | 10 | manual_review |
| 192 | 一月初 | 40 | C | chain_restaurant | 12 | manual_review |
| 193 | 少點鹹 | 40 | C | chain_restaurant | 12 | manual_review |
| 194 | 米藍餐盒 | 40 | C | chain_restaurant | 10 | manual_review |
| 195 | 初雞 | 40 | C | chain_restaurant | 11 | manual_review |
| 196 | 男朋友餐盒 | 40 | C | chain_restaurant | 11 | manual_review |
| 197 | 味道健康餐盒 | 40 | C | chain_restaurant | 10 | manual_review |
| 198 | 咕蔬搖 | 40 | C | chain_restaurant | 10 | manual_review |
| 199 | 夏野健康餐盒 | 40 | C | chain_restaurant | 9 | manual_review |
| 200 | 常常好食 | 40 | C | chain_restaurant | 10 | manual_review |

---

## 最可疑 100 筆（非 delete_candidate）

| # | 品牌 | Score | Level | Items | Reason |
|---|------|------:|-------|------:|--------|
| 1 | 太大客排骨 | 15 | D | 2 | searchable_name |
| 2 | 伊民政骨意 | 15 | D | 2 | searchable_name |
| 3 | 老東家排骨 | 15 | D | 2 | searchable_name |
| 4 | 金園排骨 | 15 | D | 2 | searchable_name |
| 5 | 鬥牛士 | 15 | D | 2 | searchable_name |
| 6 | 將將排骨 | 15 | D | 2 | searchable_name |
| 7 | 陳師父排骨 | 15 | D | 2 | searchable_name |
| 8 | 踐正排骨 | 15 | D | 2 | searchable_name |
| 9 | 三食健康餐盒 | 20 | D | 8 | searchable_name|menu_exists |
| 10 | 小餐健康餐盒 | 20 | D | 8 | searchable_name|menu_exists |
| 11 | 肌力食堂 | 20 | D | 8 | searchable_name|menu_exists |
| 12 | 肌能餐盒 | 20 | D | 8 | searchable_name|menu_exists |
| 13 | 肌動健康餐 | 20 | D | 8 | searchable_name|menu_exists |
| 14 | 肌養健康餐盒 | 20 | D | 8 | searchable_name|menu_exists |
| 15 | 艸仔健康餐盒 | 20 | D | 8 | searchable_name|menu_exists |
| 16 | 低卡廚房 | 20 | D | 8 | searchable_name|menu_exists |
| 17 | 李沐健康餐 | 20 | D | 8 | searchable_name|menu_exists |
| 18 | 每天健康餐盒 | 20 | D | 8 | searchable_name|menu_exists |
| 19 | 沃野食 | 20 | D | 8 | searchable_name|menu_exists |
| 20 | 玖健康餐盒 | 20 | D | 8 | searchable_name|menu_exists |
| 21 | 咕嚕健康餐盒 | 20 | D | 8 | searchable_name|menu_exists |
| 22 | 型動健康餐 | 20 | D | 8 | searchable_name|menu_exists |
| 23 | 食倍健康餐 | 20 | D | 8 | searchable_name|menu_exists |
| 24 | 原野健康餐盒 | 20 | D | 8 | searchable_name|menu_exists |
| 25 | 健身廚房 | 20 | D | 8 | searchable_name|menu_exists |
| 26 | 健康8 | 20 | D | 8 | searchable_name|menu_exists |
| 27 | 野蔬活 | 20 | D | 8 | searchable_name|menu_exists |
| 28 | 野餐生活 | 20 | D | 8 | searchable_name|menu_exists |
| 29 | 發酵日 | 20 | D | 8 | searchable_name|menu_exists |
| 30 | 舒食健康餐 | 20 | D | 8 | searchable_name|menu_exists |
| 31 | 綠洲健康餐 | 20 | D | 8 | searchable_name|menu_exists |
| 32 | 鮮吃健康餐盒 | 20 | D | 8 | searchable_name|menu_exists |
| 33 | Go Meal | 20 | D | 8 | searchable_name|menu_exists |
| 34 | LIGHT BOX | 20 | D | 8 | searchable_name|menu_exists |
| 35 | 一之軒 | 20 | D | 5 | searchable_name|menu_exists |
| 36 | 石锅王 | 20 | D | 5 | searchable_name|menu_exists |
| 37 | 池上飯包 | 20 | D | 5 | searchable_name|menu_exists |
| 38 | 吳寶春 | 20 | D | 5 | searchable_name|menu_exists |
| 39 | 泰愛泰 | 20 | D | 5 | searchable_name|menu_exists |
| 40 | 陳根找茶 | 20 | D | 5 | searchable_name|menu_exists |
| 41 | 楊瑞隆 | 20 | D | 5 | searchable_name|menu_exists |
| 42 | 聖瑪莉 | 20 | D | 5 | searchable_name|menu_exists |
| 43 | 韓式連鎖 | 20 | D | 5 | searchable_name|menu_exists |
| 44 | 鮮茶道 | 20 | D | 5 | searchable_name|menu_exists |
| 45 | 元味便當 | 20 | D | 3 | searchable_name|menu_exists |
| 46 | 老家排骨 | 20 | D | 3 | searchable_name|menu_exists |
| 47 | 定食8 | 20 | D | 3 | searchable_name|menu_exists |
| 48 | 喉口亭 | 20 | D | 3 | searchable_name|menu_exists |
| 49 | 曾家池上飯包 | 20 | D | 3 | searchable_name|menu_exists |
| 50 | 福隆號 | 20 | D | 3 | searchable_name|menu_exists |
| 51 | 遠東百貨美食街 | 20 | D | 3 | searchable_name|menu_exists |
| 52 | 九如排骨 | 30 | D | 2 | xval_validated|searchable_name |
| 53 | 岔路二股便當 | 30 | D | 2 | xval_validated|searchable_name |
| 54 | 圓福 | 30 | D | 2 | xval_validated|searchable_name |
| 55 | 萬年排骨 | 30 | D | 2 | xval_validated|searchable_name |
| 56 | 奮起湖便當 | 30 | D | 2 | xval_validated|searchable_name |
| 57 | 錢櫃自助餐 | 30 | D | 2 | xval_validated|searchable_name |
| 58 | 豐原排骨酥 | 30 | D | 2 | xval_validated|searchable_name |
| 59 | 洪廣德 | 35 | D | 4 | xval_validated|searchable_name|menu_exists |
| 60 | 松花湖便當 | 35 | D | 3 | xval_validated|searchable_name|menu_exists |
| 61 | 阿光排骨 | 35 | D | 3 | xval_validated|searchable_name|menu_exists |
| 62 | 奪有味 | 35 | D | 3 | xval_validated|searchable_name|menu_exists |
| 63 | 廣味香 | 35 | D | 3 | xval_validated|searchable_name|menu_exists |
| 64 | 蛋白盒子 | 40 | C | 18 | delivery_platform|searchable_name|menu_exists |
| 65 | 一月初 | 40 | C | 12 | delivery_platform|searchable_name|menu_exists |
| 66 | 少點鹹 | 40 | C | 12 | delivery_platform|searchable_name|menu_exists |
| 67 | 楽坡Bonbox | 40 | C | 12 | delivery_platform|searchable_name|menu_exists |
| 68 | 隨主飡 | 40 | C | 12 | delivery_platform|searchable_name|menu_exists |
| 69 | 初雞 | 40 | C | 11 | delivery_platform|searchable_name|menu_exists |
| 70 | 男朋友餐盒 | 40 | C | 11 | delivery_platform|searchable_name|menu_exists |
| 71 | 野宴 | 40 | C | 11 | delivery_platform|searchable_name|menu_exists |
| 72 | 給力盒子 | 40 | C | 11 | delivery_platform|searchable_name|menu_exists |
| 73 | 一日樂食 | 40 | C | 10 | delivery_platform|searchable_name|menu_exists |
| 74 | 米藍餐盒 | 40 | C | 10 | delivery_platform|searchable_name|menu_exists |
| 75 | 味道健康餐盒 | 40 | C | 10 | delivery_platform|searchable_name|menu_exists |
| 76 | 咕蔬搖 | 40 | C | 10 | delivery_platform|searchable_name|menu_exists |
| 77 | 常常好食 | 40 | C | 10 | delivery_platform|searchable_name|menu_exists |
| 78 | 覓食健康餐盒 | 40 | C | 10 | delivery_platform|searchable_name|menu_exists |
| 79 | 飽哥健康餐盒 | 40 | C | 10 | delivery_platform|searchable_name|menu_exists |
| 80 | 輕靚美 | 40 | C | 10 | delivery_platform|searchable_name|menu_exists |
| 81 | Benefit健康餐 | 40 | C | 10 | delivery_platform|searchable_name|menu_exists |
| 82 | Hello Pogai | 40 | C | 10 | delivery_platform|searchable_name|menu_exists |
| 83 | 夏野健康餐盒 | 40 | C | 9 | delivery_platform|searchable_name|menu_exists |
| 84 | 鉑金健康餐盒 | 40 | C | 9 | delivery_platform|searchable_name|menu_exists |
| 85 | 巨林美而美 | 50 | C | 35 | brand_registry|searchable_name|menu_exists|name_consistent |
| 86 | 丼丼屋 | 55 | C | 4 | xval_validated|delivery_platform|searchable_name|menu_exists |
| 87 | 十二段 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 88 | 五花馬 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 89 | 日出茶太 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 90 | 水巷茶弄 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 91 | 巧之味 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 92 | 先喝道 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 93 | 成真咖啡 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 94 | 早安山丘 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 95 | 初米好食 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 96 | 呷尚寶 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 97 | 茶聚 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 98 | 野瘦派 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 99 | 野餐日 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |
| 100 | 黑沃咖啡 | 70 | B | 35 | brand_registry|google_maps_proxy_chain_tier|searchable_name|menu_exists|name_consistent |

---

## 最常見重複品牌（canonical 合併候選）

| Canonical | Variants | Names |
|-----------|----------|-------|
| FitBox | 2 | FITBOX · FitBox |
| 享健康 | 2 | 享健康餐盒 · 享健康 |
| 全聯 | 2 | 全聯熟食 · 全聯 |

---

## Outputs

- `food_source_truth_review.csv` — 全量審核（275 rows）
- 本報告

---

## Next Steps (Founder 確認後)

1. Phase 2：對 C/D 級 + manual_review 跑 Google Maps / 外送 API
2. 執行 merge（canonical 合併）
3. quarantine → `data/food-kb/quarantine/`
4. delete_candidate → 隔離，不直接刪
5. 更新 brand-registry 收錄已驗證在地名店

**不執行：** production migration · 菜單直接覆寫 · 自動刪除
