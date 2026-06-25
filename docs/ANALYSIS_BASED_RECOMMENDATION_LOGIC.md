# 分析驅動的配餐與運動推薦

## 單一資料來源：AnalysisSummary

所有推薦皆讀取 `buildAnalysisSummary()` 輸出，不在 UI 層各自重算。

```ts
interface AnalysisSummary {
  periodType: 'day' | 'week' | 'month'
  dateRange: { start, end, label }
  insufficient_data: boolean
  weightTrend, calorieTrend, proteinTrend
  macroRatio, calorieDistribution
  insights, nextWeekSuggestions
  bestDay, needsAttentionDay, nextActions
  dinnerCaloriesRatio, proteinGapAvg, fatRatioAvg
  sugarDrinkCount, fiberGapScore
}
```

## 配餐：`meal-recommendation-strategy.ts`

| 分析訊號 | 推薦方向 |
|----------|----------|
| `proteinGapAvg >= 15` | 雞胸、茶葉蛋、豆腐、鮭魚、無糖豆漿 |
| `dinnerCaloriesRatio > 0.42` | 蒸魚、豆腐等低熱量高蛋白晚餐 |
| `fatRatioAvg > 0.38` | 蒸煮烤、少油、避開油炸 |
| `sugarDrinkCount >= 2` | 無糖茶、減少手搖甜飲 |
| `fiberGapScore < 0.2` | 花椰菜、毛豆等纖維配菜 |

輸出 `RecommendedMeal { name, calories, protein, reason, based_on_insight }`

分析頁在「下週建議」卡底部顯示配餐摘要。

## 運動：`workout-recommendation-strategy.ts`

| 分析訊號 | 推薦方向 |
|----------|----------|
| 平均熱量 > 目標 8% | 中低強度有氧 20–30 分 |
| `proteinGapAvg >= 20` | 低中強度重訓 + 補蛋白提醒 |
| 體重停滯 + 熱量達標 | NEAT、Zone 2 快走 |
| 本週運動 ≥ 3 次 | 主動恢復 / 伸展 |
| 其餘 | 依課表標題中等強度 |

輸出 `RecommendedWorkout { title, duration, estimatedCalories, intensity, reason, based_on_insight }`

## 資料不足

`insufficient_data === true` 時，兩策略皆回傳 `null`。

## Rollback

還原策略檔與 `AnalyticsScreen` 內 `buildMealRecommendationStrategy` / `buildWorkoutRecommendationStrategy` 呼叫即可；不影響資料庫。
