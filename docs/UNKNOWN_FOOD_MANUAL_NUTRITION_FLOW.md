# Unknown Food Manual Nutrition Flow

**狀態：** 已實作（client-side，無 DB migration）  
**原則：** BetterBit 可以慢一點，但不能錯。找不到資料時，正確答案不是 `0`，而是 **營養待確認**。

---

## 1. 為什麼不能顯示 0

`0 kcal` 在語意上代表「這道食物沒有熱量」，會誤導減脂決策。

當 `nutrition_status = unknown` 時：

- `calories = null`
- `protein_g = null`
- `fat_g = null`
- `carbs_g = null`

UI 顯示 **營養待確認**，不顯示 `0 kcal` / `0g 蛋白質`。  
今日合計與銀行統計 **排除** unknown 紀錄。

---

## 2. `nutrition_status` 差異

| 狀態 | 含義 | 計入今日統計 | UI |
|------|------|-------------|-----|
| `official` | food-kb / ONR / runtime verified | ✅ | 顯示官方數字 |
| `verified` | 交叉驗證通過（staging → runtime） | ✅ | 顯示 verified 數字 |
| `user_entered` | 使用者手動輸入 | ✅ | 數字 + 小標「使用者輸入」 |
| `estimated_pending_confirmation` | 待確認估算 | ❌ | 不得寫入 food_logs |
| `unknown` | 無可信資料 | ❌ | **營養待確認** |

---

## 3. GPT 使用邊界

**可以做：**

- 模糊菜名判斷
- 產生澄清問題（Smart Clarification）
- 建議可能相近品項（僅供 UI 引導）

**不可以做：**

- 直接產生最終 `calories` / `protein` / `fat` / `carbs`
- 直接寫入今日統計
- 偽裝成官方資料

澄清完成後，僅透過 `resolveMenuFromQuery` / `collectClientCandidates` 比對 **verified template**，無命中則保持 `unknown`。

---

## 4. 網路搜尋使用邊界

**可以做：**

- 建立 research candidate
- 加入 Unknown Food Queue
- 進入 staging 等待 Founder 驗證

**不可以做：**

- 即時爬到的數字寫入 production runtime
- 未交叉驗證寫入推薦
- 多來源平均當正式資料

`findSimilarVerifiedItems()` 僅回傳 `confidence >= 0.72` 的 verified hits，無命中則不顯示假候選。

---

## 5. Unknown Food Flow UI

文字紀錄建立 `unknown` 後，開啟 **Unknown Food Flow Sheet**：

1. **選相近品項** — verified hits only  
2. **手動輸入營養** — `ManualNutritionSheet` → `nutrition_status = user_entered`  
3. **幫我判斷一下** — 最多 3 題 Smart Clarification（例：菜包 → 種類 / 顆數 / 大小）

---

## 6. Auto Re-Match 流程

`runAutoRematch()` 掃描 Unknown Queue，找到 `match_score >= 95` 的 official candidate 時產生 `RematchProposal`。

使用者必須明確選擇：

- **更新** — `applyRematchProposal(..., 'update_record')`
- **保持文字紀錄** — 不覆蓋
- **查看差異** — 僅預覽

**不得自動覆蓋**使用者資料。

---

## 7. Rollback 方法

| 情境 | 作法 |
|------|------|
| 誤选手動輸入 | 刪除該筆 food_log，重新建立文字紀錄 |
| 誤選 verified 品項 | 刪除紀錄或改回 `unknown`（清除 macros） |
| 澄清後想還原 | 關閉 sheet → 保持 `unknown` |
| Queue 測試污染 | `clearUnknownQueueForTests()`（僅 test） |

無 DB migration：food_logs 存在 check-in JSON / client memory，rollback 透過 UI 刪除或覆寫同一 `id` 的 log entry。

---

## 核心模組

```
src/lib/nutrition/food-log-display.ts          — UI 顯示規則
src/lib/nutrition/unknown-food-flow.ts           — Flow 編排
src/lib/nutrition/unknown-food-clarification.ts — 菜包等澄清題
src/components/dashboard/today/UnknownFoodFlowSheet.tsx
src/components/dashboard/today/ManualNutritionSheet.tsx
src/components/dashboard/today/UnknownClarificationSheet.tsx
```

---

## 測試

```bash
npm test -- src/lib/nutrition/unknown-food-manual-nutrition.test.ts
```

涵蓋 26 項 Founder 驗收案例（不顯示 0、null macros、統計排除、手動輸入、澄清、queue、rematch 等）。
