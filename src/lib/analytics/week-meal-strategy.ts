import type { AnalysisSummary } from './analysis-summary'

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

  return [
    {
      slot: 'breakfast',
      slotLabel: '早餐',
      instruction: proteinGap >= 15 ? '提高蛋白（+20g 雞蛋或豆漿）' : '維持均衡，蛋白優先',
    },
    {
      slot: 'lunch',
      slotLabel: '午餐',
      instruction: proteinGap >= 10 ? '正常份量 + 補 25g 蛋白' : '正常',
    },
    {
      slot: 'dinner',
      slotLabel: '晚餐',
      instruction: dinnerHigh ? '降低 150 kcal，少油炸' : '控制在 600 kcal 內',
    },
    {
      slot: 'snack',
      slotLabel: '點心',
      instruction: sugarHigh ? '改無糖飲 + 低糖水果' : fiberLow ? '增加水果或毛豆' : '小份量即可',
    },
  ]
}
