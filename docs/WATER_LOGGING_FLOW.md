# Water Logging Flow

Today 頁喝水紀錄，與本週挑戰「喝水 14L」閉環。不寫入 `food_logs`，不影響熱量／蛋白質／碳水／脂肪。

## 1. Today 喝水入口

- 元件：`src/components/dashboard/today/TodayWaterLog.tsx`
- 位置：`BetterBitHome` 內，**TodayHero（熱量環／今日餐點）下方**，TodayOS（骰子）上方
- 不修改 TodayHero 主視覺區塊（圓環、巨量、餐點列表維持原樣）

### UI

| 元素 | 說明 |
|------|------|
| 標題 | 今日喝水 |
| 進度 | 已喝 X / Y ml + progress bar |
| 快捷 | +250 / +500 / +750 ml |
| 自訂 | Bottom Sheet 輸入今日總量 |
| 重設 | Sheet 內「重設今日」→ 0 ml |

### 狀態文案

- 尚未記錄：`今天還沒記錄喝水`
- 達標（≥90% 目標）：`今天喝水達標了`（無強動畫）

## 2. 每日目標邏輯

函式：`resolveDailyWaterGoalMl()`（`src/lib/water-log.ts`）

優先順序：

1. `todayPlan.daily_targets.water_ml`（週計畫）
2. `user_profiles.water_ml_target`
3. 預設 **2000 ml**

## 3. 本週 14L 計算

```
weeklyLiters = round((dailyGoalMl × 7) / 100, 1)
```

例：2000 × 7 = 14,000 ml → **14L**

本週挑戰標籤改為動態：`喝水 14L`（依使用者目標調整，如 2500/day → 17.5L）。

## 4. 與 Week 頁同步

資料來源：**既有** `daily_checkins.water_ml`（integer，無新 migration）。

| Week 指標 | 計算 |
|-----------|------|
| 挑戰「喝水 XL」 | 本週各日 `water_ml` 加總 → 公升 |
| Hero「喝水達標 X / Y 天」 | 單日 `water_ml ≥ 目標 × 0.9` 計 1 天 |

Today 點 +250 → PATCH `/api/checkin` → 當日 `water_ml` 更新 → 本週頁重新載入即反映。

## 5. 不影響營養統計

- 喝水只更新 `daily_checkins.water_ml`
- **不**寫入 `user_memory.food_logs_today`
- `sumLoggedCalories` / `sumLoggedProtein` 等不受影響
- Nutrition Accuracy、Food DB、推薦引擎未改

## 6. 驗證規則

| 規則 | 行為 |
|------|------|
| 累加 | +250 / +500 / +750 |
| 負數 | 拒絕並 toast |
| 單次 > 3000 ml | `window.confirm` 確認 |
| 換日 | `getNutritionDayKey()` 變更時 Today 本地重置為 0 |
| 重設 | Sheet「重設今日」 |
| 手改總量 | Sheet 輸入 ml 後儲存 |

## 7. Rollback

若需還原：

1. 移除 `BetterBitHome` 內 `TodayWaterLog` 與 water state
2. 刪除 `TodayWaterLog.tsx`、`WaterCustomSheet.tsx`、`water-log.ts`
3. `week-challenge.ts` 可改回固定 14L（非必要，現行為動態目標）

資料庫無 schema 變更，rollback 不需 migration。

## 相關檔案

- `src/lib/water-log.ts` — 純邏輯
- `src/lib/water-log.test.ts` — 測試
- `src/components/dashboard/today/TodayWaterLog.tsx`
- `src/components/dashboard/today/WaterCustomSheet.tsx`
- `src/components/dashboard/BetterBitHome.tsx` — 狀態 + persist
- `src/lib/analytics/week-challenge.ts` — 動態本週喝水目標
- `src/lib/checkin-utils.ts` — `buildCheckinPayload` 已含 `water_ml`
