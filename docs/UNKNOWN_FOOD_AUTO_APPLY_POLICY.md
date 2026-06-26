# Unknown Food Auto Apply Policy

**狀態：** Beta V1（silent auto apply + explanation note）  
**原則：** 可以自動補齊，但不能亂補。

---

## 1. 為什麼 Beta V1 不通知

Beta 階段優先降低使用者摩擦：若每天跳通知確認，會打斷記錄流程。

V1 改在 `resolution_note` 清楚標明：

> 此筆原為文字紀錄。BetterBit 於 YYYY/MM/DD 根據可信資料庫自動補齊營養資料…

**V2（成熟版）：** 改為 push / in-app 通知，或要求使用者確認後才計入統計。

---

## 2. Auto Apply 條件（全部成立）

| # | 條件 |
|---|------|
| 1 | `match_score >= 0.99` |
| 2 | confidence = **A** 或 **B** |
| 3 | 來源 = ONR / verified Food DNA / verified database |
| 4 | exact normalized match 或 strong alias match |
| 5 | restaurant match 或不影響判斷 |
| 6 | `nutrition_trace` 完整（source_name + source_url） |
| 7 | calories / protein / fat / carbs 完整 |
| 8 | 未被 `user_entered` 覆蓋 |
| 9 | 無 pending nutrition conflict |
| 10 | QA gate pass |

任一失敗 → **不得 auto apply**，維持 `unknown` 或標記 `pending_review`。

---

## 3. Match Score 規則

| 情境 | Score |
|------|-------|
| normalized 完全相同 | **1.00** |
| strong alias（alias token 完全命中） | **0.995** |
| 模糊 substring（如 竹筍湯 vs 竹筍排骨湯） | **≤ 0.92** → 不套用 |
| 菜包 vs 肉包 | **0**（pair deny） |

門檻：**>= 0.99** 才可 auto apply。

---

## 4. Audit Log

每次 auto apply 寫入：

- `unknown_record_id`
- `original_food_name`
- `matched_item_id` / `matched_item_name`
- `match_score`
- `source_type` / `source_url`
- `before_nutrition` / `after_nutrition`
- `auto_resolved_at`
- `qa_result`
- `rollback_token`

模組：`src/lib/nutrition/unknown-food-resolution/audit.ts`

---

## 5. Rollback

使用 `rollback_token` 一鍵還原：

```
nutrition_status = unknown
calories / protein / fat / carbs = null
```

Audit 保留，`rolled_back = true`。

---

## 6. V2 通知策略

| 版本 | 行為 |
|------|------|
| **Beta V1** | Silent auto apply + `resolution_note` |
| **V2** | 使用者通知 / 確認後才入帳 |

---

## 7. 禁止自動套用情境

1. 菜包 vs 肉包  
2. 竹筍湯 vs 竹筍排骨湯（無明確 alias）  
3. 滷味 / 自助餐 / 便當 / 火鍋 / 鹽酥雞  
4. 手搖飲未指定糖度與容量  
5. 店家不同但菜名僅相似  
6. `match_score < 0.99`  
7. confidence C / D  
8. `source_url` 缺失  
9. `user_entered` 紀錄  

---

## 執行

```bash
npm run unknown:auto-apply
```

Cron：建議每天 04:00（Asia/Taipei）執行一次。

---

## 模組

```
src/lib/nutrition/unknown-food-resolution/
  match-score.ts
  auto-apply.ts
  audit.ts
  daily-rematch-job.ts
  founder-dashboard.ts
  index.ts
```
