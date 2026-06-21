import type { ZaiJianLine } from '@/lib/copy/zaijian'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { UserBanks } from '@/lib/banks/types'
import type {
  AdherenceEvent,
  AdherenceInput,
  AdherenceState,
  CalorieSpread,
  DiceAdherenceBias,
} from './adherence-types'
import { inferAdherenceEvents } from './adherence-detect'

function computeSpread(
  todayLogged: number,
  todayTarget: number,
  dailyPace: number,
  recentLogs: FoodLogEntry[],
  events: AdherenceEvent[]
): CalorieSpread {
  const todayDelta = todayLogged - todayTarget
  let recentExcess = 0
  const byDay = new Map<string, number>()
  for (const l of recentLogs) {
    const d = l.logged_at.slice(0, 10)
    byDay.set(d, (byDay.get(d) ?? 0) + l.calories)
  }
  for (const kcal of byDay.values()) {
    if (kcal > todayTarget * 1.15) recentExcess += kcal - todayTarget
  }

  const excessKcal = Math.max(0, todayDelta) + recentExcess * 0.35
  let spreadDays = 0
  let dailyAdjustKcal = 0

  if (excessKcal <= 0) {
    return { excessKcal: 0, spreadDays: 0, dailyAdjustKcal: 0 }
  }

  if (excessKcal >= 2000 || events.includes('social_event')) {
    spreadDays = 10
    dailyAdjustKcal = -Math.min(120, Math.round(dailyPace * 0.25))
  } else if (excessKcal >= 500) {
    spreadDays = 5
    dailyAdjustKcal = -Math.min(80, Math.round(dailyPace * 0.18))
  } else if (excessKcal >= 100) {
    spreadDays = 3
    dailyAdjustKcal = -Math.min(45, Math.round(dailyPace * 0.1))
  }

  return { excessKcal: Math.round(excessKcal), spreadDays, dailyAdjustKcal }
}

function computeDiceBias(events: AdherenceEvent[], spread: CalorieSpread): DiceAdherenceBias {
  const social = events.includes('social_event')
  const recovery = events.includes('recovery')
  const stress = events.includes('stress_eating')
  const plateau = events.includes('plateau')

  let calTargetScale = 1
  if (spread.dailyAdjustKcal < 0) calTargetScale = 0.97
  if (recovery) calTargetScale = 1.02
  if (social) calTargetScale = 1

  return {
    preferEnjoyable: social || stress || recovery,
    avoidExtremeLight: social || stress || recovery || plateau,
    calTargetScale,
    proteinBoost: plateau || stress ? 1.08 : 1,
  }
}

function buildExternalLine(
  events: AdherenceEvent[],
  isReturnVisit: boolean,
  lastLogDeltaKcal: number
): ZaiJianLine {
  if (isReturnVisit) {
    return {
      text: '最近忙嗎？',
      expression: 'tired',
      subtext: '回來就好。今天照常。',
    }
  }
  if (events.includes('social_event') || lastLogDeltaKcal >= 500) {
    return {
      text: '昨天吃得很開心。',
      expression: 'normal',
      subtext: '不用急著補。接下來幾天我會慢慢幫你接回來。今天照常就好。',
    }
  }
  if (events.includes('plateau')) {
    return {
      text: '最近睡可能比較少。',
      expression: 'normal',
      subtext: '平均熱量其實有達標。先觀察幾天。脂肪沒那麼愛演。',
    }
  }
  if (events.includes('recovery')) {
    return {
      text: '最近忙嗎？',
      expression: 'tired',
      subtext: '回來就好。今天照常。',
    }
  }
  if (events.includes('sleep_debt') || events.includes('night_shift')) {
    return {
      text: '夜班辛苦了。',
      expression: 'tired',
      subtext: '能吃多少記多少。照你的時間吃就好。',
    }
  }
  if (events.includes('stress_eating')) {
    return {
      text: '這週不用完美。',
      expression: 'tired',
      subtext: '照你能做到的就好。剩下交給我。',
    }
  }
  if (events.includes('travel')) {
    return {
      text: '出門方便最重要。',
      expression: 'normal',
      subtext: '回來再說。今天先顧好眼前這餐。',
    }
  }
  if (events.includes('sick_signal')) {
    return {
      text: '先休息。',
      expression: 'tired',
      subtext: '吃好消化的。運動先擺一邊。',
    }
  }
  if (lastLogDeltaKcal >= 100) {
    return {
      text: '最近吃得比較開心。',
      expression: 'normal',
      subtext: '今天正常就好。我幫你處理。',
    }
  }
  return {
    text: '好 choice。',
    expression: 'normal',
    subtext: '今天照常過。剩下交給我。',
  }
}

export function buildAdherenceState(
  input: AdherenceInput,
  lastLogDeltaKcal = 0
): AdherenceState {
  const events = inferAdherenceEvents(input)
  const spread = computeSpread(
    input.todayLoggedKcal,
    input.todayTargetKcal,
    input.dailyPaceKcal,
    input.recentLogs,
    events
  )
  const dice = computeDiceBias(events, spread)
  const isReturnVisit =
    input.recentMissedDays >= 3 ||
    (input.daysSinceLastLog != null && input.daysSinceLastLog >= 3)

  let plateauNote: AdherenceState['plateauNote']
  if (events.includes('plateau')) {
    plateauNote = {
      text: '這週體重沒有明顯變化。',
      subtext: events.includes('sleep_debt')
        ? '最近睡可能比較少。平均熱量其實有達標。先觀察幾天。脂肪沒那麼愛演。'
        : '體重本來就不會每天掉。你有在照顧自己。先觀察幾天。',
    }
  }

  return {
    events,
    spread,
    dice,
    isReturnVisit,
    plateauNote,
  }
}

export function adherenceToCorrectionLine(
  state: AdherenceState,
  banks: UserBanks,
  lastLogDeltaKcal = 0
): ZaiJianLine {
  const base = buildExternalLine(state.events, state.isReturnVisit, lastLogDeltaKcal)

  if (base.text === '好 choice。' && banks.protein.gapG >= 25) {
    return {
      text: '好 choice。',
      expression: 'normal',
      subtext: '睡前喝個豆漿就差不多了。',
    }
  }
  if (base.text === '好 choice。' && banks.exercise.remainingSessions > 0 && banks.exercise.remainingSessions <= 2) {
    return {
      text: '好 choice。',
      expression: 'normal',
      subtext: `這週還有 ${banks.exercise.remainingSessions} 次。找一天補就好。`,
    }
  }

  return base
}

/** meal-trust-copy 用：從內部事件推白話情境（不顯示事件名） */
export function adherenceToTrustEvent(state: AdherenceState): import('@/lib/human-mode').LifeEventMode | null {
  if (state.events.includes('social_event')) return 'cheat'
  if (state.events.includes('travel')) return 'travel'
  if (state.events.includes('sick_signal')) return 'sick'
  if (state.events.includes('stress_eating')) return 'stress'
  if (state.events.includes('recovery')) return 'bad_week'
  return null
}

export function effectiveMealCalTarget(baseKcal: number, state: AdherenceState): number {
  return Math.round(baseKcal * state.dice.calTargetScale)
}

export function enjoyableDiceBonus(itemName: string, state: AdherenceState): number {
  if (!state.dice.preferEnjoyable) return 0
  if (/沙拉|水煮|雞胸|無糖|清炒|燙青菜/.test(itemName) && state.dice.avoidExtremeLight) return 8
  if (/飯|麵|丼|便當|鍋|堡|套餐|定食/.test(itemName)) return -12
  return 0
}
