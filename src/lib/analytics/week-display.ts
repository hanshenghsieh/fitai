import type { WeekSummary } from './week-summary'
import type { CoachInsightCard } from './week-insights'

export interface WeekHeroDisplay {
  loggedDays: number
  totalPastDays: number
  avgCalories: number | null
  calorieTarget: number
  calorieDelta: number | null
  metDays: number
  metTotalDays: number
  headline: string
  interpretation: string
}

export interface WeekFocusAction {
  title: string
  body: string
  tone: 'accent' | 'neutral'
}

export function buildWeekHeroDisplay(summary: WeekSummary): WeekHeroDisplay {
  const { analysis, dailyScores } = summary
  const pastDays = dailyScores.filter(d => !d.isFuture)
  const loggedDays = pastDays.filter(d => d.calories > 0).length
  const totalPastDays = pastDays.length
  const avgCalories = analysis.calorieTrend.average
  const calorieTarget = analysis.calorieTrend.target
  const calorieDelta = analysis.calorieTrend.deltaFromTarget
  const metDays = analysis.calorieTrend.metDays
  const metTotalDays = analysis.calorieTrend.totalDays

  let headline = `這週記錄 ${loggedDays} 天`
  if (avgCalories != null && calorieDelta != null) {
    if (Math.abs(calorieDelta) <= 80) {
      headline += `，平均接近目標 ${avgCalories} kcal`
    } else if (calorieDelta > 0) {
      headline += `，平均比目標高 ${calorieDelta} kcal`
    } else {
      headline += `，平均比目標低 ${Math.abs(calorieDelta)} kcal`
    }
  } else if (loggedDays > 0) {
    headline += '，持續記錄中'
  }

  let interpretation = '先記錄今天第一餐，本週趨勢會越來越清楚。'
  if (loggedDays >= 3) {
    if ((analysis.dinnerCaloriesRatio ?? 0) > 0.42) {
      interpretation = '你不是失控，只是晚餐容易超出。'
    } else if ((analysis.proteinGapAvg ?? 0) >= 15) {
      interpretation = '蛋白質連續偏低，明天優先補一點就好。'
    } else if (metDays >= Math.ceil(metTotalDays * 0.6)) {
      interpretation = '整體節奏不錯，維持現在的記錄習慣。'
    } else if (calorieDelta != null && calorieDelta > 150) {
      interpretation = '外食份量稍大，下一餐選小一點的組合就好。'
    } else {
      interpretation = '有在記錄就有進步，不用補過去的餐。'
    }
  }

  return {
    loggedDays,
    totalPastDays,
    avgCalories,
    calorieTarget,
    calorieDelta,
    metDays,
    metTotalDays,
    headline,
    interpretation,
  }
}

export function pickWeekFocusAction(summary: WeekSummary): WeekFocusAction {
  const warning = summary.insights.find(i => i.tone === 'warning')
  if (warning) {
    return {
      title: warning.title,
      body: warning.suggestion.replace(/^建議：/, ''),
      tone: 'accent',
    }
  }

  const openChallenge = summary.challenges.find(c => !c.done)
  if (openChallenge) {
    return {
      title: `這週先把${openChallenge.label.split(' ')[0] ?? '目標'}做好`,
      body: `目前 ${openChallenge.current} / ${openChallenge.target} ${openChallenge.unit}，一步一步來就好。`,
      tone: 'neutral',
    }
  }

  const mealTip = summary.mealStrategy.find(r => r.instruction !== '正常')
  if (mealTip) {
    return {
      title: `這週先把${mealTip.slotLabel}控制好`,
      body: mealTip.instruction,
      tone: 'neutral',
    }
  }

  if (summary.weeklyMetrics.proteinMetDays < 3) {
    return {
      title: '明天優先補 25g 蛋白質',
      body: '雞胸、豆腐或鮭魚都可以，不用一次補完本週。',
      tone: 'accent',
    }
  }

  return {
    title: '明天先記錄第一餐',
    body: '不用補昨天，記錄下一餐就好。',
    tone: 'neutral',
  }
}

export function weekInsightPriority(a: CoachInsightCard, b: CoachInsightCard): number {
  const toneScore = (t: CoachInsightCard['tone']) => (t === 'warning' ? 0 : t === 'neutral' ? 1 : 2)
  return toneScore(a.tone) - toneScore(b.tone)
}
