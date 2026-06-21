/** Phase 7 — Adherence Engine 內部事件（使用者永遠看不到標籤） */

export type AdherenceEvent =
  | 'social_event'
  | 'sleep_debt'
  | 'stress_eating'
  | 'plateau'
  | 'recovery'
  | 'travel'
  | 'night_shift'
  | 'sick_signal'

export interface CalorieSpread {
  /** 近幾日累積正偏差（吃比計畫多） */
  excessKcal: number
  /** 分散回穩的天數 */
  spreadDays: number
  /** 每日內部微調（負=略收，不餓肚子） */
  dailyAdjustKcal: number
}

export interface DiceAdherenceBias {
  /** 偏好仍好吃、仍像人飯 */
  preferEnjoyable: boolean
  /** 不強推沙拉/雞胸懲罰餐 */
  avoidExtremeLight: boolean
  /** 本餐目標熱量倍率（0.92–1.08 微調） */
  calTargetScale: number
  /** 蛋白質略為加權 */
  proteinBoost: number
}

export interface AdherenceState {
  events: AdherenceEvent[]
  spread: CalorieSpread
  dice: DiceAdherenceBias
  isReturnVisit: boolean
  /** 平台期敘事（可選，僅再健語氣） */
  plateauNote?: { text: string; subtext: string }
}

export interface AdherenceInput {
  workSchedule?: 'standard' | 'shift'
  todayLogs: import('@/lib/banks/types').FoodLogEntry[]
  recentLogs: import('@/lib/banks/types').FoodLogEntry[]
  todayTargetKcal: number
  dailyPaceKcal: number
  todayLoggedKcal: number
  recentMissedDays: number
  workoutDone: number
  workoutTotal: number
  isWeightPlateau?: boolean
  sleepHoursTarget?: number | null
  daysSinceLastLog?: number
}
