# Menu Backfill Sprint 1 Report

Generated: 2026-06-25T16:18:21.211Z

> Staging only — NOT production. Zero hallucination policy.

## 1. 本次處理餐廳數

- Sprint 目標: **30**
- 有寫入 staging 品項: **14**
- production_candidate: **14**

## 2. 每家新增品項數

| 餐廳 | 品項數 | 狀態 | 未滿 20 原因 |
|------|-------:|------|-------------|
| 麥當勞 | 13 | production_candidate | 額度 20，目前可追溯 13 道（官方資料不足，未硬補） |
| 肯德基 | 6 | production_candidate | 額度 20，目前可追溯 6 道（官方資料不足，未硬補） |
| 摩斯漢堡 | 5 | production_candidate | 額度 20，目前可追溯 5 道（官方資料不足，未硬補） |
| 漢堡王 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| Subway | 3 | production_candidate | 額度 20，目前可追溯 3 道（官方資料不足，未硬補） |
| 八方雲集 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| 四海遊龍 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| 三商巧福 | 12 | production_candidate | 額度 20，目前可追溯 12 道（官方資料不足，未硬補） |
| 鬍鬚張 | 9 | production_candidate | 額度 20，目前可追溯 9 道（官方資料不足，未硬補） |
| 吉野家 | 2 | production_candidate | 額度 20，目前可追溯 2 道（官方資料不足，未硬補） |
| Sukiya | 3 | production_candidate | 額度 20，目前可追溯 3 道（官方資料不足，未硬補） |
| 丸龜製麵 | 5 | production_candidate | 額度 20，目前可追溯 5 道（官方資料不足，未硬補） |
| 藏壽司 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| 壽司郎 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| 爭鮮 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| 7-11 | 24 | production_candidate | 額度 200，目前可追溯 24 道（官方資料不足，未硬補） |
| 全家 | 24 | production_candidate | 額度 200，目前可追溯 24 道（官方資料不足，未硬補） |
| 萊爾富 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| OK mart | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| 全聯 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| 家樂福 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| Costco | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| 星巴克 | 7 | production_candidate | 額度 20，目前可追溯 7 道（官方資料不足，未硬補） |
| 路易莎 | 7 | production_candidate | 額度 20，目前可追溯 7 道（官方資料不足，未硬補） |
| cama café | 3 | production_candidate | 額度 20，目前可追溯 3 道（官方資料不足，未硬補） |
| 50嵐 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| 清心福全 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| CoCo | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| 可不可熟成紅茶 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| 迷客夏 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |

## 3. A/B/C/D 分布

| Grade | Count |
|-------|------:|
| A | 14 |
| B | 109 |
| C | 0 |
| D | 0 |

## 4. pending_review 數量

**0**

## 5. 沒有補滿 20 道的原因

僅納入 official-ref、final-menu（7-11/全家鮮食）、restaurant-expanded（官方營養參考）且通過 QA 的品項。無來源不補。

## 6. source_url 缺失數

**0**

## 7. nutrition conflict 清單

_無營養衝突_

## 8. production_candidate 清單

- 麥當勞 (13 items)
- 肯德基 (6 items)
- 摩斯漢堡 (5 items)
- Subway (3 items)
- 三商巧福 (12 items)
- 鬍鬚張 (9 items)
- 吉野家 (2 items)
- Sukiya (3 items)
- 丸龜製麵 (5 items)
- 7-11 (24 items)
- 全家 (24 items)
- 星巴克 (7 items)
- 路易莎 (7 items)
- cama café (3 items)

## 9. 仍缺資料的餐廳

- 漢堡王
- 八方雲集
- 四海遊龍
- 藏壽司
- 壽司郎
- 爭鮮
- 萊爾富
- OK mart
- 全聯
- 家樂福
- Costco
- 50嵐
- 清心福全
- CoCo
- 可不可熟成紅茶
- 迷客夏

## 10. 下個 Sprint 建議

- 漢堡王、四海遊龍、藏壽司：補官方營養表人工驗證
- 手搖飲（50嵐、CoCo、可不可）：補官方糖分/熱量公開資料
- 全聯、家樂福、Costco：熟食區官方營養標示

---

**Awaiting Founder Review before promote to runtime.**