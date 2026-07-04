import type { AnalysisSummary } from './analysis-summary'

export interface ProgressHeroDisplay {
  headline: string
  interpretation: string
  periodLabel: string
}

export function buildProgressHeroDisplay(summary: AnalysisSummary): ProgressHeroDisplay {
  const { calorieTrend, proteinTrend, dietRecordSummary, weightTrend, periodType } = summary
  const periodLabel =
    periodType === 'day' ? '今天' : periodType === 'week' ? '最近 7 天' : '最近 30 天'

  const loggedMeals = dietRecordSummary.totalMeals
  const metRatio =
    calorieTrend.totalDays > 0 ? calorieTrend.metDays / calorieTrend.totalDays : 0

  let headline = `${periodLabel}記錄 ${loggedMeals} 餐`
  if (calorieTrend.average != null && calorieTrend.deltaFromTarget != null) {
    if (Math.abs(calorieTrend.deltaFromTarget) <= 80) {
      headline += `，熱量接近目標`
    } else if (calorieTrend.deltaFromTarget > 0) {
      headline += `，平均高出目標 ${calorieTrend.deltaFromTarget} kcal`
    } else {
      headline += `，平均低於目標 ${Math.abs(calorieTrend.deltaFromTarget)} kcal`
    }
  }

  let interpretation = '先記錄今天，趨勢會越來越清楚。'
  if (loggedMeals >= 5) {
    if ((summary.dinnerCaloriesRatio ?? 0) > 0.42) {
      interpretation = '記錄算穩定，但晚餐熱量偏高。'
    } else if ((summary.proteinGapAvg ?? 0) >= 15) {
      interpretation = '有在記錄，蛋白質可以再補一點。'
    } else if (metRatio >= 0.6) {
      interpretation = '節奏不錯，維持現在的記錄習慣就好。'
    } else if (weightTrend.deltaKg != null && weightTrend.deltaKg < -0.8) {
      interpretation = '體重降得有點快，份量不用再壓太低。'
    } else {
      interpretation = '你不是沒進步，週末比較容易偏離也正常。'
    }
  }

  if (proteinTrend.metDays >= proteinTrend.totalDays - 1 && proteinTrend.totalDays >= 3) {
    interpretation = '蛋白質表現穩定，繼續這樣記就好。'
  }

  return { headline, interpretation, periodLabel }
}
