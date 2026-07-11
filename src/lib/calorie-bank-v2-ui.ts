import { addDays, format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import {
  clampDailyAdjust,
  computeRecoveryWindow,
  DEFAULT_CALORIE_FLOOR_FEMALE,
  isRecoveryActive,
  recoveryTargetsForDayOffsets,
} from '@/lib/engines/calorie-bank-engine'

export type CalorieBankMiniState = 'over' | 'space' | 'recovery'

export const SPREAD_DAY_OPTIONS = [3, 5, 10] as const
export type SpreadDayOption = (typeof SPREAD_DAY_OPTIONS)[number]

export interface CalorieBankMiniCopy {
  state: CalorieBankMiniState
  headline: string
  body: string
  cta: string
}

export interface SpreadDayPreview {
  dateLabel: string
  originalKcal: number
  adjustKcal: number
  targetKcal: number
}

export function resolveCalorieBankMiniState(
  bank: CalorieBankRow,
  overTarget = false
): CalorieBankMiniState | null {
  const diff = bank.internal_target_kcal - bank.daily_target_kcal
  const recovery = isRecoveryActive(bank)

  if (overTarget || bank.delta_kcal > 0) return 'over'
  if (recovery || diff < 0) return 'recovery'
  if (diff > 0) return 'space'
  return null
}

export function getCalorieBankMiniCopy(state: CalorieBankMiniState): Omit<CalorieBankMiniCopy, 'state'> {
  if (state === 'over') {
    return {
      headline: '今天稍微超標了',
      body: '系統會幫你分攤到未來幾天，不用重來 💚',
      cta: '查看回補計畫',
    }
  }
  if (state === 'space') {
    return {
      headline: '今天還有空間',
      body: '系統會幫你保留節奏，穩定往目標前進 💚',
      cta: '查看熱量銀行',
    }
  }
  return {
    headline: '回補計畫進行中',
    body: '今天目標已自動調整，照著吃就好 💚',
    cta: '查看回補計畫',
  }
}

export function shouldShowCalorieBankMini(bank: CalorieBankRow | null | undefined, overTarget = false): boolean {
  if (!bank) return false
  return resolveCalorieBankMiniState(bank, overTarget) != null
}

export function getTodayExcessKcal(bank: CalorieBankRow): number {
  if (bank.recovery_balance_kcal > 0 && bank.delta_kcal > 0) {
    return Math.max(bank.delta_kcal, bank.recovery_balance_kcal)
  }
  if (bank.recovery_balance_kcal > 0) return bank.recovery_balance_kcal
  return Math.max(0, bank.delta_kcal)
}

export function defaultSpreadDays(bank: CalorieBankRow): SpreadDayOption {
  const remaining = bank.spread_days_remaining
  if (remaining <= 3) return 3
  if (remaining <= 5) return 5
  if (SPREAD_DAY_OPTIONS.includes(remaining as SpreadDayOption)) return remaining as SpreadDayOption
  const suggested = computeRecoveryWindow(bank.recovery_balance_kcal || Math.max(0, bank.delta_kcal)).spreadDays
  if (suggested <= 3) return 3
  if (suggested <= 5) return 5
  return 10
}

export function previewSpreadDays(
  bank: CalorieBankRow,
  spreadDays: SpreadDayOption,
  calorieFloor = DEFAULT_CALORIE_FLOOR_FEMALE
): SpreadDayPreview[] {
  const normal = bank.daily_target_kcal
  const excess = getTodayExcessKcal(bank)
  const window = computeRecoveryWindow(excess)
  const adjust =
    spreadDays === bank.spread_days_remaining && bank.daily_adjust_kcal < 0
      ? bank.daily_adjust_kcal
      : clampDailyAdjust(
          window.dailyAdjustKcal !== 0
            ? window.dailyAdjustKcal
            : -Math.round(excess / spreadDays),
          normal,
          calorieFloor
        )

  const targets = recoveryTargetsForDayOffsets(normal, spreadDays, adjust, calorieFloor, spreadDays)

  return targets.map((targetKcal, index) => ({
    dateLabel: formatSpreadDayLabel(index + 1),
    originalKcal: normal,
    adjustKcal: targetKcal - normal,
    targetKcal,
  }))
}

function formatSpreadDayLabel(dayOffset: number): string {
  const d = addDays(new Date(), dayOffset)
  const datePart = format(d, 'M/d（EEE）', { locale: zhTW })
  if (dayOffset === 1) return `明天 ${datePart}`
  if (dayOffset === 2) return `後天 ${datePart}`
  return datePart
}

export function getDetailHeroCopy(bank: CalorieBankRow, miniState: CalorieBankMiniState): string {
  if (miniState === 'space') {
    return '昨天吃得比目標少，Betterbit 已把熱量溫和回補到今天。照著調整後的預算吃，節奏會更穩定。'
  }
  if (miniState === 'recovery' && bank.delta_kcal <= 0) {
    return '熱量銀行正在幫你平衡前幾天的節奏。今天的目標已微調，照著吃就好，減脂計畫不會中斷。'
  }
  return '今天熱量超標了，別擔心！我們會幫你把超標的熱量，分攤到未來幾天的每日預算中，讓你減脂計畫不中斷。'
}

export function getDetailCtaLabel(bank: CalorieBankRow): string {
  return isRecoveryActive(bank) ? '確認回補計畫' : '了解了'
}
