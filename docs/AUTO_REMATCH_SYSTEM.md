# Auto Re-Match System

## 觸發時機

當以下資料更新後，應呼叫 `runAutoRematch(catalog?)`：

- Food Database / menu-lookup-index
- ONR（Official Nutrition Reference）
- Food DNA templates

## 比對邏輯

1. 掃描 `Unknown Queue` 中 `status = waiting` 的項目
2. 對每筆 `food_name`：
   - 執行 `collectAllCandidates()`
   - 可選：與新 catalog 清單做 `scoreNameSimilarity()`
3. **Match Score ≥ 95%** → 產生 `RematchProposal`

## 使用者決策（強制）

系統 **不得自動覆蓋** 既有紀錄。

| 動作 | 行為 |
|------|------|
| `update_record` | 使用者確認後才更新營養 |
| `keep_text` | 保持 Text Only |
| `view_diff` | 僅顯示差異，不寫入 |

```ts
import { runAutoRematch, applyRematchProposal } from '@/lib/nutrition/search-v2'

const proposals = runAutoRematch(newCatalogItems)
for (const p of proposals) {
  // 通知 UI：「我們找到可信營養資料」
  applyRematchProposal(p, 'update_record') // 僅在使用者點擊後
}
```

## 範例

| 日期 | 事件 |
|------|------|
| 2026/06/26 | 使用者記錄「竹筍湯」→ unknown |
| 2026/08 | ONR 新增「膳馨綠竹筍排骨湯」 |
| Re-match | Score > 95% → 通知 Founder / 使用者 |

## 測試

見 `search-v2.test.ts` — Auto Re-Match、不得自動覆蓋使用者選擇。
