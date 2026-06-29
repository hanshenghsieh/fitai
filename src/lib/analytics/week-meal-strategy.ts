import type { AnalysisSummary } from './analysis-summary'
import { isRapidWeightLoss } from './weight-pace'

export interface MealStrategyRow {
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  slotLabel: string
  instruction: string
}

export function generateMealStrategy(summary: AnalysisSummary): MealStrategyRow[] {
  if (summary.insufficient_data) return []

  const proteinGap = summary.proteinGapAvg ?? 0
  const dinnerHigh = (summary.dinnerCaloriesRatio ?? 0) > 0.42
  const sugarHigh = summary.sugarDrinkCount >= 2
  const fiberLow = (summary.fiberGapScore ?? 1) < 0.2
  const rapidLoss = isRapidWeightLoss(summary.weightTrend.deltaKg)

  return [
    {
      slot: 'breakfast',
      slotLabel: '早餐',
      instruction: rapidLoss
        ? '維持足量蛋白，不要刻意再壓低熱量'
        : proteinGap >= 15
          ? '提高蛋白（+20g 雞蛋或豆漿）'
          : '維持均衡，蛋白優先',
    },
    {
      slot: 'lunch',
      slotLabel: '午餐',
      instruction: rapidLoss
        ? '正常份量，穩定吃飽'
        : proteinGap >= 10
          ? '正常份量 + 補 25g 蛋白'
          : '正常',
    },
    {
      slot: 'dinner',
      slotLabel: '晚餐',
      instruction: rapidLoss
        ? '維持穩定份量，避免再壓太低熱量'
        : dinnerHigh
          ? '降低 150 kcal，少油炸'
          : '控制在 600 kcal 內',
    },
    {
      slot: 'snack',
      slotLabel: '點心',
      instruction: rapidLoss
        ? '可選優格或水果，避免空腹太久'
        : sugarHigh
          ? '改無糖飲 + 低糖水果'
          : fiberLow
            ? '增加水果或毛豆'
            : '小份量即可',
    },
  ]
}
