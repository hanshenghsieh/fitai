# P0 Retail ONR Rescue Report

Generated: 2026-06-27T15:33:08.859Z

> **Founder Decision:** Stop Sprint 7 bulk scaffold. P0 only: 萊爾富 · OK mart · 全聯.

## 1. 處理品牌

- **萊爾富** (`hilife`) — ONR 0 品項
- **OK mart** (`okmart`) — ONR 0 品項
- **全聯** (`pxmart`) — ONR 0 品項

## 2. 官方來源探查

| 品牌 | 官方 URL | Puppeteer 完整四宏量 |
|------|----------|---------------------|
| 萊爾富 | productInfo_food.aspx | **0** |
| OK mart | hotProducts_purchase | **0** |
| 全聯 | 美味堂品牌頁 | **0**（僅部分蛋白質描述） |

## 3. 新增 ONR 品項數

| 品牌 | 新增 A/B |
|------|----------|
| 萊爾富 | **0** |
| OK mart | **0** |
| 全聯 | **0** |
| **合計** | **0** |

## 4. A/B/C/D 分布

| Grade | Count |
|-------|------:|
| A | 0 |
| B | 0 |
| C | 0 |
| D | 0 |

## 5. 被拒絕 / blocked 品項

- **萊爾富 · 茶葉蛋** — `blocked_by_missing_official_nutrition`: 官網 SPA 無 per-item 營養；Puppeteer 0 筆完整四宏量
- **萊爾富 · 御飯糰系列** — `blocked_by_missing_official_nutrition`: 官網無數位化營養表；僅包裝標示
- **萊爾富 · 能量主餐/便當** — `blocked_by_missing_official_nutrition`: 官網無 per-item 熱量蛋白脂肪碳水
- **OK mart · 哈燒熱點/便當** — `blocked_by_missing_official_nutrition`: hotProducts_purchase 頁面無 server-render 營養
- **OK mart · 飯糰/手捲** — `blocked_by_missing_official_nutrition`: 官網無完整四宏量數位來源
- **全聯 · 美味堂 幸福餐盒** — `blocked_by_missing_official_nutrition`: 品牌頁僅規格/描述，無完整四宏量
- **全聯 · 美味堂 阿薩姆茶葉蛋** — `blocked_by_missing_official_nutrition`: 官網僅 350g/包 規格，無 per-serving 四宏量
- **全聯 · 美味堂 輕食沙拉胸** — `blocked_by_missing_official_nutrition`: 官網僅 100g/包 規格，無完整營養標示頁
- **全聯 · 美味堂 浩克爸爸照燒雞腿排** — `blocked_by_missing_official_nutrition`: 官網僅標示 54.8g 蛋白質/380g，缺 calories/fat/carbs

## 6. source_url 缺失數

- Curated accepted items missing source_url: **0**
- Blocked (no official nutrition online): **9**

## 7. nutrition conflict 數

- **0**（本 Sprint 未寫入 staging production_candidate）

## 8. production_candidate 清單

_無 — 零幻覺政策下未找到可追溯四宏量官方來源，未硬補。_

## 9. 對推薦池的實際提升

| 指標 | 值 |
|------|-----|
| 零售 dice recommendable 主餐（runtime） | 0 |
| 第一餐 0 攝入 · 15 次 reroll 唯一店家 | 12 |
| 15 次 reroll 唯一 combo 標籤 | 15 |
| 是否仍只剩 4 個 | **否** |

## 10. Founder Review 建議

**暫不 promote。** 瓶頸是官方數位營養缺口，不是 queue/scaffold。

下一批（需 Founder 核准）：
1. 包裝營養標示照片人工录入（Priority B）— 萊爾富/OK/全聯各 20 主餐
2. 向通路索取官方 Excel/PDF 鮮食營養表（Priority A）
3. 維持 **停止 Sprint 7 bulk draft** 直到 ONR ≥3 主餐/品牌

---

ONR brands complete: 17/20