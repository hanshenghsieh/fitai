# Food Source False Negative Audit

**Generated:** 2026-06-24T16:18:19.275Z  
**Phase 2 status:** PAUSED — no live API, no delete/merge/migration  
**Input:** `food_source_truth_review.csv` (Phase 1) + offline brand anchors + menu delivery corpus

---

## Principle

寧可人工審核 500 筆，不要誤刪 1 個真實品牌。

本報告專門找出 Phase 1 **誤殺（False Negative）**：被標為 D / quarantine / manual_review，但離線交叉驗證顯示為真實品牌。

---

## Summary

| Metric | Count |
|--------|------:|
| Phase 1 總品牌數 | 275 |
| 本次掃描（D + quarantine + manual_review） | 87 |
| **誤殺品牌（False Negative）** | **48** |
| **真正垃圾資料** | **9** |
| **應保留品牌（掃描範圍內）** | **51** |
| **Phase 2 預估保留率** | **58.6%** |

> 預估保留率 = 應保留品牌 / 掃描數。代表 Phase 1 低信任品牌中，離線復原後仍建議保留的比例。

---

## 誤殺原因（Phase 1 系統性缺陷）

1. **brand-registry 未收錄** — 鼎泰豐、丸龜製麵、春水堂、王品旗下品牌等不在 registry，離線分數上限約 20–30
2. **別名未合併** — 50嵐↔五十嵐、清心↔清心福全、梁社漢↔梁社漢排骨
3. **子品牌未繼承** — 爭鮮PLUS、好市多熟食↔Costco
4. **外送品牌低估** — 有 Uber Eats / foodpanda corpus 但無 registry 加分
5. **百貨美食街** — 京站/遠東百貨美食街被當一般 chain 且分數過低

---

## 特別檢查（Founder 指定品牌）

| 品牌 | Phase 1 狀態 | 誤殺？ | 建議 |
|------|-------------|--------|------|
| 鼎泰豐 | keep | no (already A) | already_keep |
| 丸龜製麵 | keep | no (already A) | already_keep |
| 春水堂 | keep | no (already A) | already_keep |
| 夏慕尼 | keep | no (already A) | already_keep |
| 西堤牛排 | keep | no (already A) | already_keep |
| 陶板屋 | keep | no (already A) | already_keep |
| IKEA | keep | no (already A) | already_keep |
| 星巴克 | keep | no (already A) | already_keep |
| 路易莎 | keep | no (already A) | already_keep |
| 藏壽司 | keep | no (already A) | already_keep |
| 壽司郎 | keep | no (already A) | already_keep |
| 爭鮮迴轉壽司 | keep | no (already A) | already_keep |
| 麥當勞 | keep | no (already A) | already_keep |
| 肯德基 | keep | no (already A) | already_keep |
| 全聯 | keep | no (already A) | already_keep |
| 家樂福 | keep | no (already A) | already_keep |

---

## 真正垃圾資料（確認可 quarantine）

| 品牌 | 原因 |
|------|------|
| 太大客排骨 | likely OCR/seed typo — no known Taiwan chain |
| 伊民政骨意 | likely garbled seed data |
| 老東家排骨 | unverified single-location seed, 2 items only |
| 自助餐組件 | pattern:^自助餐組件$ |
| 金園排骨 | unverified, may be local but no cross-source hit |
| 將將排骨 | unverified seed |
| 陳師父排骨 | unverified seed |
| 踐正排骨 | unverified seed |
| 韓式連鎖 | generic placeholder store name, not a real brand |

---

## 高優先恢復（restore_keep / add_registry_and_keep）

| 品牌 | Phase 1 分數 | 估計真實信心 | 建議 |
|------|------------:|-------------|------|
| 一之軒 | 20 | 75 (high) | add_registry_and_keep |
| 丼丼屋 | 55 | 100 (very_high) | restore_keep |
| 巨林美而美 | 50 | 100 (very_high) | restore_keep |
| 吳寶春 | 20 | 75 (high) | add_registry_and_keep |
| 定食8 | 20 | 70 (high) | add_registry_and_keep |
| 泰愛泰 | 20 | 75 (high) | add_registry_and_keep |
| 鬥牛士 | 15 | 70 (high) | add_registry_and_keep |
| 聖瑪莉 | 20 | 75 (high) | add_registry_and_keep |
| 錢櫃自助餐 | 30 | 80 (high) | add_registry_and_keep |
| 鮮茶道 | 20 | 75 (high) | add_registry_and_keep |

---

## 健康餐盒掃描（manual_review + quarantine）

| 品牌 | 狀態 | 誤殺 | 外送 corpus | 建議 |
|------|------|------|-------------|------|
| 米藍餐盒 | manual_review | yes | no/corpus_delivery | manual_verify_keep |
| 男朋友餐盒 | manual_review | yes | no/corpus_delivery | manual_verify_keep |
| 味道健康餐盒 | manual_review | yes | corpus_delivery/no | manual_verify_keep |
| 夏野健康餐盒 | manual_review | yes | no/corpus_delivery | manual_verify_keep |
| 蛋白盒子 | manual_review | yes | corpus_delivery/corpus_delivery | manual_verify_keep |
| 覓食健康餐盒 | manual_review | yes | no/corpus_delivery | manual_verify_keep |
| 野宴 | manual_review | yes | corpus_delivery/corpus_delivery | manual_verify_keep |
| 給力盒子 | manual_review | yes | corpus_delivery/no | manual_verify_keep |
| 鉑金健康餐盒 | manual_review | yes | corpus_delivery/no | manual_verify_keep |
| 飽哥健康餐盒 | manual_review | yes | corpus_delivery/no | manual_verify_keep |
| Benefit健康餐 | manual_review | yes | corpus_delivery/no | manual_verify_keep |
| 三食健康餐盒 | quarantine | no | no/no | confirm_quarantine |
| 小餐健康餐盒 | quarantine | no | no/no | confirm_quarantine |
| 肌力食堂 | quarantine | no | no/no | confirm_quarantine |
| 肌能餐盒 | quarantine | no | no/no | confirm_quarantine |
| 肌動健康餐 | quarantine | no | no/no | confirm_quarantine |
| 肌養健康餐盒 | quarantine | no | no/no | confirm_quarantine |
| 艸仔健康餐盒 | quarantine | no | no/no | confirm_quarantine |
| 低卡廚房 | quarantine | no | no/no | confirm_quarantine |
| 李沐健康餐 | quarantine | no | no/no | confirm_quarantine |
| 每天健康餐盒 | quarantine | no | no/no | confirm_quarantine |
| 玖健康餐盒 | quarantine | no | no/no | confirm_quarantine |
| 咕嚕健康餐盒 | quarantine | no | no/no | confirm_quarantine |
| 型動健康餐 | quarantine | no | no/no | confirm_quarantine |
| 食倍健康餐 | quarantine | no | no/no | confirm_quarantine |
| 原野健康餐盒 | quarantine | no | no/no | confirm_quarantine |
| 健康8 | quarantine | no | no/no | confirm_quarantine |
| 舒食健康餐 | quarantine | no | no/no | confirm_quarantine |
| 綠洲健康餐 | quarantine | no | no/no | confirm_quarantine |
| 鮮吃健康餐盒 | quarantine | no | no/no | confirm_quarantine |

---

## Top 300 真實品牌

| # | 品牌 | 分數 | 等級 | 類型 | 狀態 |
|---|------|-----:|------|------|------|
| 1 | 7-11 | 100 | A | convenience_store | keep |
| 2 | 三商巧福 | 100 | A | chain_restaurant | keep |
| 3 | 瓦城 | 100 | A | chain_restaurant | keep |
| 4 | 全家 | 100 | A | convenience_store | keep |
| 5 | 吉野家 | 100 | A | chain_restaurant | keep |
| 6 | 肌肉海灘 | 100 | A | chain_restaurant | keep |
| 7 | 爭鮮迴轉壽司 | 100 | A | chain_restaurant | keep |
| 8 | 肯德基 | 100 | A | chain_restaurant | keep |
| 9 | 星巴克 | 100 | A | cafe | keep |
| 10 | 健人餐廚 | 100 | A | chain_restaurant | keep |
| 11 | 麥當勞 | 100 | A | chain_restaurant | keep |
| 12 | 路易莎 | 100 | A | cafe | keep |
| 13 | 摩斯漢堡 | 100 | A | chain_restaurant | keep |
| 14 | 鬍鬚張 | 100 | A | chain_restaurant | keep |
| 15 | Subway | 100 | A | chain_restaurant | keep |
| 16 | 丼丼屋 | 100 | A-restored | chain_restaurant | **待恢復** |
| 17 | 巨林美而美 | 100 | A-restored | street_food | **待恢復** |
| 18 | 72度C舒肥健康餐 | 95 | A | chain_restaurant | keep |
| 19 | 85度C | 95 | A | cafe | keep |
| 20 | 一沐日 | 95 | A | drink_shop | keep |
| 21 | 一蘭 | 95 | A | chain_restaurant | keep |
| 22 | 八方雲集 | 95 | A | chain_restaurant | keep |
| 23 | 大心 | 95 | A | chain_restaurant | keep |
| 24 | 大戶屋 | 95 | A | chain_restaurant | keep |
| 25 | 大潤發 | 95 | A | supermarket | keep |
| 26 | 五十嵐 | 95 | A | drink_shop | keep |
| 27 | 可不可 | 95 | A | drink_shop | keep |
| 28 | 台灣夜市 | 95 | A | night_market | keep |
| 29 | 四海遊龍 | 95 | A | chain_restaurant | keep |
| 30 | 必勝客 | 95 | A | chain_restaurant | keep |
| 31 | 石二鍋 | 95 | A | chain_restaurant | keep |
| 32 | 全聯 | 95 | A | supermarket | keep |
| 33 | 全聯熟食 | 95 | A | supermarket | merge |
| 34 | 再睡五分鐘 | 95 | A | drink_shop | keep |
| 35 | 早安美芝城 | 95 | A | street_food | keep |
| 36 | 老乾杯 | 95 | A | chain_restaurant | keep |
| 37 | 亞尼克 | 95 | A | chain_restaurant | keep |
| 38 | 和牛涮 | 95 | A | chain_restaurant | keep |
| 39 | 林東芳 | 95 | A | chain_restaurant | keep |
| 40 | 哈根達斯 | 95 | A | chain_restaurant | keep |
| 41 | 屋馬 | 95 | A | chain_restaurant | keep |
| 42 | 段純貞 | 95 | A | chain_restaurant | keep |
| 43 | 美而美 | 95 | A | street_food | keep |
| 44 | 家樂福 | 95 | A | supermarket | keep |
| 45 | 悟饕池上便當 | 95 | A | chain_restaurant | keep |
| 46 | 海底撈 | 95 | A | chain_restaurant | keep |
| 47 | 涓豆腐 | 95 | A | chain_restaurant | keep |
| 48 | 迷客夏 | 95 | A | drink_shop | keep |
| 49 | 乾杯 | 95 | A | chain_restaurant | keep |
| 50 | 梁社漢排骨 | 95 | A | chain_restaurant | keep |
| 51 | 清心福全 | 95 | A | drink_shop | keep |
| 52 | 麥味登 | 95 | A | street_food | keep |
| 53 | 麻古茶坊 | 95 | A | drink_shop | keep |
| 54 | 勝博殿 | 95 | A | chain_restaurant | keep |
| 55 | 萊爾富 | 95 | A | convenience_store | keep |
| 56 | 貳樓 | 95 | A | chain_restaurant | keep |
| 57 | 愛買 | 95 | A | supermarket | keep |
| 58 | 達美樂 | 95 | A | chain_restaurant | keep |
| 59 | 壽司郎 | 95 | A | chain_restaurant | keep |
| 60 | 漢堡王 | 95 | A | chain_restaurant | keep |
| 61 | 樂子 | 95 | A | chain_restaurant | keep |
| 62 | 燒肉LIKE | 95 | A | chain_restaurant | keep |
| 63 | 築間 | 95 | A | chain_restaurant | keep |
| 64 | 藏壽司 | 95 | A | chain_restaurant | keep |
| 65 | cama | 95 | A | cafe | keep |
| 66 | CoCo都可 | 95 | A | drink_shop | keep |
| 67 | CoCo壹番屋 | 95 | A | chain_restaurant | keep |
| 68 | COLD STONE | 95 | A | chain_restaurant | keep |
| 69 | Costco | 95 | A | supermarket | keep |
| 70 | OK超商 | 95 | A | convenience_store | keep |
| 71 | SUKIYA | 95 | A | chain_restaurant | keep |
| 72 | Texas Roadhouse | 95 | A | chain_restaurant | keep |
| 73 | 12MINI | 92 | A | chain_restaurant | keep |
| 74 | 50嵐 | 92 | A | chain_restaurant | keep |
| 75 | 丸龜製麵 | 92 | A | chain_restaurant | keep |
| 76 | 千葉火鍋 | 92 | A | chain_restaurant | keep |
| 77 | 大苑子 | 92 | A | drink_shop | keep |
| 78 | 小蒙牛 | 92 | A | chain_restaurant | keep |
| 79 | 山頭火 | 92 | A | chain_restaurant | keep |
| 80 | 丹丹漢堡 | 92 | A | chain_restaurant | keep |
| 81 | 丹堤咖啡 | 92 | A | cafe | keep |
| 82 | 屯京拉麵 | 92 | A | chain_restaurant | keep |
| 83 | 台鐵便當 | 92 | A | chain_restaurant | keep |
| 84 | 弘爺漢堡 | 92 | A | street_food | keep |
| 85 | 必艾客 | 92 | A | chain_restaurant | keep |
| 86 | 正忠排骨飯 | 92 | A | chain_restaurant | keep |
| 87 | 好市多熟食 | 92 | A | chain_restaurant | keep |
| 88 | 池上木片便當 | 92 | A | chain_restaurant | keep |
| 89 | 老先覺 | 92 | A | chain_restaurant | keep |
| 90 | 老賴紅茶 | 92 | A | chain_restaurant | keep |
| 91 | 老賴茶棧 | 92 | A | drink_shop | keep |
| 92 | 肉多多 | 92 | A | chain_restaurant | keep |
| 93 | 西堤牛排 | 92 | A | chain_restaurant | keep |
| 94 | 伯朗 | 92 | A | chain_restaurant | keep |
| 95 | 伯朗咖啡 | 92 | A | cafe | keep |
| 96 | 豆腐村 | 92 | A | chain_restaurant | keep |
| 97 | 京站美食街 | 92 | A | chain_restaurant | keep |
| 98 | 拉亞漢堡 | 92 | A | street_food | keep |
| 99 | 欣葉 | 92 | A | chain_restaurant | keep |
| 100 | 爭鮮PLUS | 92 | A | chain_restaurant | keep |
| 101 | 花月嵐 | 92 | A | chain_restaurant | keep |
| 102 | 非常泰 | 92 | A | chain_restaurant | keep |
| 103 | 春水堂 | 92 | A | chain_restaurant | keep |
| 104 | 珍煮丹 | 92 | A | drink_shop | keep |
| 105 | 夏慕尼 | 92 | A | chain_restaurant | keep |
| 106 | 悟饕池上飯包 | 92 | A | chain_restaurant | keep |
| 107 | 拿坡里 | 92 | A | chain_restaurant | keep |
| 108 | 烏弄 | 92 | A | drink_shop | keep |
| 109 | 茶湯會 | 92 | A | drink_shop | keep |
| 110 | 得正 | 92 | A | drink_shop | keep |
| 111 | 晨間廚房 | 92 | A | street_food | keep |
| 112 | 梁社漢 | 92 | A | chain_restaurant | keep |
| 113 | 涮乃葉 | 92 | A | chain_restaurant | keep |
| 114 | 清心 | 92 | A | chain_restaurant | keep |
| 115 | 陶板屋 | 92 | A | chain_restaurant | keep |
| 116 | 頂呱呱 | 92 | A | chain_restaurant | keep |
| 117 | 微風廣場美食街 | 92 | A | mall_food_court | keep |
| 118 | 新光三越美食街 | 92 | A | mall_food_court | keep |
| 119 | 萬波 | 92 | A | drink_shop | keep |
| 120 | 誠品生活美食街 | 92 | A | mall_food_court | keep |
| 121 | 鼎泰豐 | 92 | A | chain_restaurant | keep |
| 122 | 漢來海港 | 92 | A | chain_restaurant | keep |
| 123 | 福勝亭 | 92 | A | chain_restaurant | keep |
| 124 | 福隆便當 | 92 | A | chain_restaurant | keep |
| 125 | 聚北海道鍋物 | 92 | A | chain_restaurant | keep |
| 126 | 樂麵屋 | 92 | A | chain_restaurant | keep |
| 127 | 錢都 | 92 | A | chain_restaurant | keep |
| 128 | 龜記 | 92 | A | drink_shop | keep |
| 129 | 韓虎嘯 | 92 | A | chain_restaurant | keep |
| 130 | 韓姜熙 | 92 | A | chain_restaurant | keep |
| 131 | 點點心 | 92 | A | chain_restaurant | keep |
| 132 | 麵屋武藏 | 92 | A | chain_restaurant | keep |
| 133 | 饗食天堂 | 92 | A | chain_restaurant | keep |
| 134 | 饗泰多 | 92 | A | chain_restaurant | keep |
| 135 | Chili's | 92 | A | chain_restaurant | keep |
| 136 | CoCo | 92 | A | chain_restaurant | keep |
| 137 | COMEBUY | 92 | A | drink_shop | keep |
| 138 | IKEA | 92 | A | chain_restaurant | keep |
| 139 | Q Burger | 92 | A | street_food | keep |
| 140 | TGI Fridays | 92 | A | chain_restaurant | keep |
| 141 | YAYOI彌生軒 | 92 | A | chain_restaurant | keep |
| 142 | 八曜和茶 | 85 | A | drink_shop | keep |
| 143 | 不二家 | 85 | A | chain_restaurant | keep |
| 144 | 天下三絕 | 85 | A | chain_restaurant | keep |
| 145 | 北村豆腐家 | 85 | A | chain_restaurant | keep |
| 146 | 多那之 | 85 | A | cafe | keep |
| 147 | 老董牛肉麵 | 85 | A | chain_restaurant | keep |
| 148 | 肉次方 | 85 | A | chain_restaurant | keep |
| 149 | 杏子豬排 | 85 | A | chain_restaurant | keep |
| 150 | 享健康 | 85 | A | chain_restaurant | keep |
| 151 | 享健康餐盒 | 85 | A | chain_restaurant | merge |
| 152 | 兩班家 | 85 | A | chain_restaurant | keep |
| 153 | 東池飯包 | 85 | A | chain_restaurant | keep |
| 154 | 松屋 | 85 | A | chain_restaurant | keep |
| 155 | 金仙滷肉飯 | 85 | A | chain_restaurant | keep |
| 156 | 皇家傳承牛肉麵 | 85 | A | chain_restaurant | keep |
| 157 | 浜壽司 | 85 | A | chain_restaurant | keep |
| 158 | 能量小姐 | 85 | A | chain_restaurant | keep |
| 159 | 茶六 | 85 | A | chain_restaurant | keep |
| 160 | 森度餐廚 | 85 | A | chain_restaurant | keep |
| 161 | 微風舒舒 | 85 | A | mall_food_court | keep |
| 162 | 德州美墨炸雞 | 85 | A | chain_restaurant | keep |
| 163 | 樂卡餐盒 | 85 | A | chain_restaurant | keep |
| 164 | 蔬方 | 85 | A | chain_restaurant | keep |
| 165 | 繼光香香雞 | 85 | A | chain_restaurant | keep |
| 166 | CAFE!N | 85 | A | cafe | keep |
| 167 | FitBox | 85 | A | chain_restaurant | keep |
| 168 | FITBOX | 85 | A | chain_restaurant | merge |
| 169 | Jason's | 85 | A | supermarket | keep |
| 170 | Magic Touch | 85 | A | chain_restaurant | keep |
| 171 | Mia C'bon | 85 | A | supermarket | keep |
| 172 | Miss Energy | 85 | A | chain_restaurant | keep |
| 173 | SOGO美食街 | 85 | A | mall_food_court | keep |
| 174 | 錢櫃自助餐 | 80 | A-restored | chain_restaurant | **待恢復** |
| 175 | 一之軒 | 75 | A-restored | chain_restaurant | **待恢復** |
| 176 | 吳寶春 | 75 | A-restored | chain_restaurant | **待恢復** |
| 177 | 泰愛泰 | 75 | A-restored | chain_restaurant | **待恢復** |
| 178 | 聖瑪莉 | 75 | A-restored | chain_restaurant | **待恢復** |
| 179 | 鮮茶道 | 75 | A-restored | chain_restaurant | **待恢復** |
| 180 | 十二段 | 70 | B | chain_restaurant | keep |
| 181 | 五花馬 | 70 | B | chain_restaurant | keep |
| 182 | 日出茶太 | 70 | B | drink_shop | keep |
| 183 | 水巷茶弄 | 70 | B | drink_shop | keep |
| 184 | 巧之味 | 70 | B | chain_restaurant | keep |
| 185 | 先喝道 | 70 | B | drink_shop | keep |
| 186 | 成真咖啡 | 70 | B | cafe | keep |
| 187 | 早安山丘 | 70 | B | street_food | keep |
| 188 | 初米好食 | 70 | B | chain_restaurant | keep |
| 189 | 呷尚寶 | 70 | B | street_food | keep |
| 190 | 茶聚 | 70 | B | drink_shop | keep |
| 191 | 野瘦派 | 70 | B | chain_restaurant | keep |
| 192 | 野餐日 | 70 | B | chain_restaurant | keep |
| 193 | 黑沃咖啡 | 70 | B | cafe | keep |
| 194 | 燒肉Smile | 70 | B | chain_restaurant | keep |
| 195 | 鍋台銘 | 70 | B | chain_restaurant | keep |
| 196 | 鶴茶樓 | 70 | B | drink_shop | keep |
| 197 | 定食8 | 70 | A-restored | chain_restaurant | **待恢復** |
| 198 | 鬥牛士 | 70 | A-restored | chain_restaurant | **待恢復** |

---

## 輸出檔案

- `false_negative_review.csv` — 全掃描結果（87 rows）
- 本報告

---

## Next Steps（需 Founder 確認，仍不執行 production 變更）

1. 將 `restore_keep` / `add_registry_and_keep` 品牌加入 brand-registry
2. 修正 Phase 1 評分：子品牌繼承、別名合併、外送 corpus 加分
3. 僅對 `confirm_quarantine` 的 9 筆考慮隔離
4. Phase 2 恢復後再評估是否啟用 live API 驗證

