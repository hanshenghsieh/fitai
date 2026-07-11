# Push Copy Library

BetterBit Push Notification Engine v1 文案庫說明。

---

## 總量

執行時由 `notification-copy-library.ts` 建構，目標 **≥ 500** 句唯一 `title + body` 組合。

查詢：

```typescript
import { totalCopyCount, countCopyByCategory } from '@/lib/notifications/notification-copy-library'

totalCopyCount()
countCopyByCategory()
```

---

## 分類與最低句數

| Category | 說明 | 最低句數 |
|----------|------|----------|
| `breakfast_reminder` | 早餐／第一餐 | 80+ |
| `lunch_reminder` | 午餐 | 80+ |
| `dinner_reminder` | 晚餐 | 80+ |
| `water_reminder` | 喝水 | 50+ |
| `protein_reminder` | 蛋白質 | 50+ |
| `workout_reminder` | 運動 | 50+ |
| `encouragement` | 鼓勵 | 60+ |
| `over_target_comfort` | 超標後安慰 | 40+ |
| `target_hit` | 達標 | 30+ |
| `ai_coach_insight` | AI 教練洞察 | 30+ |

另支援從 `WeekSummary.insights` 動態注入 `ai_coach_insight` 單句（`buildAiInsightCopyFromLine`）。

---

## 風格原則

- 像教練，不像鬧鐘
- 溫柔、實用、簡短
- 禁止：羞辱、焦慮、「失敗」「胖」「懶」等詞（`passesCopySafetyCheck`）

### 範例

- 「午餐先補蛋白質，下午會穩很多。」
- 「今天還差一點蛋白質，茶葉蛋或雞胸都可以。」
- 「超了一點沒關係，下一餐拉回來就好。」
- 「今天不用完美，先記一餐就很好。」
- 「晚餐可以簡單一點，明天身體會謝謝你。」

---

## 通知 payload 格式

```typescript
{
  title: string
  body: string
  category: NotificationCategory
  priority: 'low' | 'normal' | 'high'
  trigger_reason: string
  cooldown_days: number      // 預設 90
  min_interval_hours: number   // 預設 4
  copy_id: string
  time_slot: NotificationTimeSlot
}
```

---

## 去重

- 同 `copy_id`：**90 天**內不重複（見 `notification-dedupe.ts`）
- 動態洞察句：較短 cooldown（30 天）

---

## 維護

新增文案請：

1. 加入 `notification-copy-library.ts` 對應分類種子
2. 確認 `passesCopySafetyCheck` 通過
3. 執行 `npm test` 驗證分類計數與安全稽核
