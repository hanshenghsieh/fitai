/** 平台期敘事 — 沒瘦 ≠ 失敗 */

import { differenceInDays } from 'date-fns'
import type { BodyMeasurement } from '@/types'

export interface PlateauStoryInput {
  measurements: BodyMeasurement[]
  /** 0–1 本週餐點達標率（若有） */
  mealAdherence?: number | null
  /** 0–1 本週運動達標率（若有） */
  workoutAdherence?: number | null
  sleepHoursTarget?: number | null
}

export function buildPlateauStory(input: PlateauStoryInput): { text: string; subtext: string } | null {
  const weights = input.measurements
    .filter(m => m.weight_kg != null)
    .map(m => ({ kg: m.weight_kg as number, at: m.measured_at }))

  if (weights.length < 5) return null

  const recent = weights.slice(-7)
  const min = Math.min(...recent.map(r => r.kg))
  const max = Math.max(...recent.map(r => r.kg))
  const flat = max - min < 0.3

  if (!flat) return null

  const daysSpan =
    recent.length >= 2
      ? differenceInDays(new Date(recent[recent.length - 1].at), new Date(recent[0].at))
      : 0

  const mealOk = (input.mealAdherence ?? 0) >= 0.6
  const workoutOk = (input.workoutAdherence ?? 0) >= 0.5

  let subtext = '體重本來就不會每天掉。我先不亂調，再觀察幾天。'

  if (mealOk && workoutOk) {
    subtext = '這週該做的你有在做。體重沒動，不代表白費。我先不調，再觀察幾天。'
  } else if (mealOk) {
    subtext = '吃的大致有照計畫。體重暫時沒動很正常。先不調，別自責。'
  } else if (daysSpan >= 5) {
    subtext = '最近生活可能比較亂。沒關係。想回來時，照今天這餐就好。'
  }

  return {
    text: '這週體重沒有明顯變化。',
    subtext,
  }
}
