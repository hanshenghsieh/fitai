# BetterBit Restaurant & Menu Data Report

Generated: 2026-06-25T07:53:27.560Z

## Data sources

| Source | Role |
|--------|------|
| `src/lib/convenience-store-menu.ts` | Runtime core menu (eatOutMenu) |
| `data/food-kb/dice-menu-bulk.json` | Bulk variants merged at runtime |
| `data/food-kb/top300-allowlist.json` | Canonical 600-restaurant list |
| Supabase `kb_food_items` | Pipeline mirror — **not used at runtime** |

## Summary (core menu only)

| Metric | Value |
|--------|-------|
| Restaurant total (allowlist) | 600 |
| Menu items total | 6400 |
| Restaurants without menu | 450 |
| Avg items / restaurant (with menu) | 42.7 |
| Restaurants with <3 items | 3 |
| Items missing store | 0 |
| Stores not in allowlist | 128 |
| Items missing nutrition | 0 |

## Summary (core + bulk)

| Metric | Value |
|--------|-------|
| Restaurant total (allowlist) | 600 |
| Menu items total | 52139 |
| Restaurants without menu | 450 |
| Avg items / restaurant (with menu) | 347.6 |
| Restaurants with <3 items | 3 |
| Items missing store | 0 |
| Stores not in allowlist | 128 |
| Items missing nutrition | 0 |

## Restaurants without menu (allowlist, core only)

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
- 一芳水果茶
- 翰林茶館
- 五桐號
- 度小月
- 阿霞飯店
- 金峰魯肉飯
- 黃記魯肉飯
- 今大魯肉飯
- 矮仔財滷肉飯
- 天天利美食坊
- 阜杭豆漿
- 永和豆漿
- 世界豆漿大王
- 鬍鬚張便當
- 佳味鮮便當
- 大埔鐵板燒
- 紅花鐵板燒
- 龐德羅莎
- 貴族世家
- 孫東寶
- 我家牛排
- 牛角日本燒肉
- 安安燒肉
- 燒肉眾
- 添好運
- … and 400 more

## Restaurants with fewer than 3 items (core only)

- 西堤牛排
- 陶板屋
- 誠品生活美食街

## Stores in menu but NOT in 600 allowlist (core only)

- 野宴
- 丼丼屋
- 蛋白盒子
- 健人餐廚
- 覓食健康餐盒
- 楊瑞隆
- 池上飯包
- 東池飯包
- 福隆號
- 洪廣德
- 奪有味
- 廣味香
- 圓福
- 松花湖便當
- 老家排骨
- 阿光排骨
- 九如排骨
- 喉口亭
- 伊民政骨意
- 將將排骨
- 豐原排骨酥
- 金園排骨
- 萬年排骨
- 踐正排骨
- 元味便當
- 陳師父排骨
- 曾家池上飯包
- 奮起湖便當
- 太大客排骨
- 岔路二股便當
- 老東家排骨
- 錢櫃自助餐
- 鬥牛士
- 定食8
- 給力盒子
- 隨主飡
- 楽坡Bonbox
- 一月初
- 少點鹹
- 肌肉海灘
- 男朋友餐盒
- 一日樂食
- 飽哥健康餐盒
- 常常好食
- 輕靚美
- Hello Pogai
- 微風舒舒
- 初雞
- 味道健康餐盒
- 米藍餐盒
- 咕蔬搖
- Benefit健康餐
- 夏野健康餐盒
- 鉑金健康餐盒
- 舒食健康餐
- 健身廚房
- 低卡廚房
- 肌動健康餐
- 原野健康餐盒
- 三食健康餐盒
- 肌力食堂
- 肌能餐盒
- 沃野食
- 小餐健康餐盒
- 艸仔健康餐盒
- 咕嚕健康餐盒
- 每天健康餐盒
- 發酵日
- 野蔬活
- 健康8
- 鮮吃健康餐盒
- 型動健康餐
- 肌養健康餐盒
- 食倍健康餐
- 綠洲健康餐
- 野餐生活
- 李沐健康餐
- 玖健康餐盒
- LIGHT BOX
- Go Meal
- … and 48 more

## Items missing nutrition (core, first 30)


## Answers

1. **Restaurant total (allowlist):** 600
2. **Menu items total (core + bulk):** 52139
3. **Restaurants with zero menu:** 450
4. **See list above** for restaurants without menu_items
5. **Avg items per restaurant (with menu):** 347.6
6. **Restaurants with <3 items:** 3
7. **Menu items without store:** 0
8. **Stores not in allowlist:** 128 unique store names
9. **Duplicate restaurant names in allowlist:** 23
10. **Items missing nutrition fields:** 0
