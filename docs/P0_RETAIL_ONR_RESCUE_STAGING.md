# Menu Backfill P0 Retail ONR Rescue Report

Generated: 2026-06-27T15:32:49.522Z

> Staging only — NOT production. Zero hallucination policy.

## 1. 本次處理餐廳數

- Sprint 目標: **3**
- 沿用前 Sprint 餐廳: **128**
- 本 Sprint 有寫入 staging 品項: **0**
- production_candidate: **0**

## 2. 每家新增品項數

| 餐廳 | 品項數 | 狀態 | 未滿額度原因 |
|------|-------:|------|-------------|
| 萊爾富 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| OK mart | 0 | draft | 無可追溯官方營養品項 — 未硬補 |
| 全聯 | 0 | draft | 無可追溯官方營養品項 — 未硬補 |

## 3. A/B/C/D 分布

| Grade | Count |
|-------|------:|
| A | 0 |
| B | 0 |
| C | 0 |
| D | 0 |

## 4. pending_review 數量

**0**

## 5. 沒有補滿額度的原因

僅納入 official-ref、final-menu（超商鮮食）、restaurant-expanded（官方營養參考）且通過 QA 的品項。無來源不補。

## 6. source_url 缺失數

**0**

## 7. nutrition conflict 清單

_無營養衝突_

## 8. production_candidate 清單

_尚無_

## 9. 仍缺資料的餐廳

- 萊爾富
- OK mart
- 全聯

## 10. 下個 Sprint 建議

- 包裝營養標示人工录入（Priority B）
- 向萊爾富/OK/全聯索取官方 Excel 鮮食營養表
- 維持停止 Sprint 7 bulk draft

---

**Awaiting Founder Review before promote to runtime.**