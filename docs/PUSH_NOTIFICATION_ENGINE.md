# BetterBit Push Notification Engine v1

動態 AI 教練式推播：依 **Today / Week / Analysis** 狀態決定內容，不是固定鬧鐘。

---

## 架構

```
src/lib/notifications/
├── notification-types.ts       # 型別、時段、上限
├── notification-copy-library.ts # 500+ 句教練文案
├── notification-dedupe.ts      # 90 天去重、分類連發限制
├── notification-scheduler.ts   # 時段、靜音、legacy cron 對應
├── notification-context.ts     # Today / Week 狀態建構（串 Analysis）
├── notification-engine.ts      # 規則引擎主邏輯
├── notification-delivery.ts    # Firebase FCM（缺 SDK 時不發送）
└── notification-engine.test.ts
```

---

## 行為摘要

| 規則 | 說明 |
|------|------|
| 每日上限 | 最多 **5** 則 |
| 靜音時段 | **23:00–07:00** 不推播 |
| 文案去重 | 同一句 **90 天** 內不重複 |
| 分類連發 | 同一 category 連續不超過 **2** 次 |
| 蛋白質達標 | 不推 `protein_reminder` |
| 晚餐已記錄 | 不推 `dinner_reminder` |
| 今日超標 | 不推餐點／高蛋白；改推喝水、安慰、收尾 |
| 無任何餐點 | 優先早餐／第一餐提醒 |
| 本週蛋白不足 | 午餐／晚餐前優先高蛋白建議 |
| 運動不足 | 下午／傍晚推運動提醒 |

### 建議時段

| Slot | 時間 | 常見類型 |
|------|------|----------|
| morning | 07–09 | 早餐、鼓勵 |
| pre_lunch | 11–12 | 午餐、蛋白質 |
| afternoon | 14–17 | 喝水、運動、達標 |
| pre_dinner | 17–19 | 晚餐、蛋白質、洞察 |
| bedtime | 20–22 | 鼓勵、超標安慰、達標 |

---

## 與 Today / Week / Analysis 串接

```typescript
import { buildTodayNotificationState, buildWeekAnalysisHintsFromWeekSummary, runNotificationEngine } from '@/lib/notifications/notification-engine'
import { buildWeekSummary } from '@/lib/analytics/week-summary'

const today = buildTodayNotificationState({
  foodLogs,
  caloriesTarget: 1800,
  proteinTargetG: 100,
  waterMl: checkin.water_ml,
  waterTargetMl: 2000,
})

const week = buildWeekAnalysisHintsFromWeekSummary(buildWeekSummary(weekInput))

const result = runNotificationEngine({
  userId,
  now: new Date(),
  today,
  week,
  sentHistory: [], // 由呼叫端提供（無 DB schema 變更）
  dryRun: !process.env.FIREBASE_ADMIN_SDK,
})
```

`sentHistory` 需由 API / cron 呼叫端維護（例如未來可存在既有 JSON 欄位，**本版不改 schema**）。

---

## API 整合（不破壞現有 Cron）

既有 `/api/cron/send-scheduled-notifications` **維持原樣**（仍呼叫 legacy `type: breakfast|lunch|...`）。

新引擎透過 `/api/send-notifications` 選用：

```json
POST /api/send-notifications
{
  "useCoachEngine": true,
  "userId": "uuid",
  "type": "lunch",
  "dryRun": true,
  "coachContext": {
    "today": { "...": "..." },
    "week": { "...": "..." },
    "sentHistory": []
  }
}
```

- `dryRun: true` 或缺少 `FIREBASE_ADMIN_SDK` → 只回傳 `notifications`，不發送。
- 未帶 `useCoachEngine` → 沿用 `zaijian` 文案（舊行為）。

---

## 環境變數

| 變數 | 用途 |
|------|------|
| `FIREBASE_ADMIN_SDK` | Firebase Admin JSON；**未設定時僅 dry-run** |
| `CRON_SECRET` | 既有 cron 驗證（未變更） |

---

## 測試

```bash
npm test
```

涵蓋：每日上限、靜音時段、去重、動態規則、羞辱詞過濾、legacy cron 相容等 **30+** 案例。

---

## 相關文件

- [`PUSH_COPY_LIBRARY.md`](./PUSH_COPY_LIBRARY.md) — 文案分類與數量
