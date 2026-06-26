# Unknown Food Pipeline

## 流程

```
使用者輸入菜名
    ↓
searchNutritionV2()
    ↓
Level C / 明確 home-cooking → enqueueUnknownFood()
    ↓
Unknown Queue（記憶體，非 Production DB）
    ↓
Founder / Data 補 ONR、Food KB
    ↓
runAutoRematch() → 提案（不自動覆蓋）
    ↓
使用者選擇：更新紀錄 | 保持文字 | 查看差異
```

## Unknown Queue 欄位

| 欄位 | 說明 |
|------|------|
| `food_name` | 使用者輸入 |
| `restaurant` | 餐廳（可空） |
| `created_at` | 首次建立 |
| `times_used` | 使用次數 |
| `last_used` | 最後使用 |
| `waiting_days` | 等待天數 |
| `possible_matches` | 系統建議的相近品項 |
| `status` | waiting / matched / dismissed / updated |

## Text Only Record

當 `nutrition_status = unknown`：

- `calories`, `protein`, `fat`, `carbs`, `fiber`, `sugar`, `sodium` → **NULL**
- **不進入** 營養統計
- UI 文案：「目前沒有可信營養資料。已先建立文字紀錄。」

## Unknown Analytics

```ts
import { getUnknownAnalytics } from '@/lib/nutrition/search-v2'

getUnknownAnalytics()
// → top_unknown, restaurant_unknown, waiting_days_avg, pending_review
```

供 Founder Dashboard 決定優先補哪些菜。

## 儲存說明

V2 階段 Queue 為 **in-memory**（`unknown-queue.ts`），符合「不得 Migration / 不得改 Production Schema」。

未來接上 Supabase 時可替換 storage adapter，介面不變。
