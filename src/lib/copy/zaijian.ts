/** 再健語氣庫 — 全站唯一文案來源（636 則 permanent database） */

import {
  pickCharacterMessage,
  pickDiceRerollMessage,
  type CharacterMessage,
  type MessageCategory,
  type ZaijianExpression as CMExpression,
} from './characterMessages'

export type ZaiJianExpression =
  | 'normal'
  | 'eye-roll'
  | 'proud'
  | 'sleepy'
  | 'hungry'
  | 'coffee'
  | 'moon'
  | 'workout'
  | 'tired'
  | 'plateau'
  | 'cheat'
  | 'water'
  | 'suspicious'

export type ZaiJianMoment =
  | 'home'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'water'
  | 'workout'
  | 'decide'
  | 'decide_rolling'
  | 'decide_result'
  | 'overeat'
  | 'cheat_recovery'
  | 'missed_workout'
  | 'plateau'
  | 'streak_7'
  | 'streak_30'
  | 'streak_100'
  | 'rest_day'
  | 'late_night'
  | 'success'
  | 'error'
  | 'loading'
  | 'empty'
  | 'notify_prompt'
  | 'week_open'
  | 'onboarding_1'
  | 'onboarding_2'
  | 'onboarding_3'
  | 'onboarding_4'

export interface ZaiJianLine {
  text: string
  expression: ZaiJianExpression
  subtext?: string
}

const MOMENT_CATEGORY: Record<ZaiJianMoment, MessageCategory> = {
  home: 'morning',
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  water: 'water',
  workout: 'workout',
  decide: 'lunch',
  decide_rolling: 'loading',
  decide_result: 'success',
  overeat: 'cheatMeal',
  cheat_recovery: 'afterOvereating',
  missed_workout: 'noExercise',
  plateau: 'weightPlateau',
  streak_7: 'streak7',
  streak_30: 'streak30',
  streak_100: 'streak100',
  rest_day: 'restDay',
  late_night: 'lateNight',
  success: 'success',
  error: 'error',
  loading: 'loading',
  empty: 'empty',
  notify_prompt: 'pushNotification',
  week_open: 'weekend',
  onboarding_1: 'firstWeek',
  onboarding_2: 'firstWeek',
  onboarding_3: 'firstWeek',
  onboarding_4: 'firstWeek',
}

function mapExpression(expr: CMExpression): ZaiJianExpression {
  const map: Record<CMExpression, ZaiJianExpression> = {
    normal: 'normal',
    happy: 'normal',
    proud: 'proud',
    eyeRoll: 'eye-roll',
    suspicious: 'suspicious',
    plateau: 'plateau',
    sleepy: 'sleepy',
    hungry: 'hungry',
    tired: 'tired',
    coffee: 'coffee',
    sleep: 'moon',
    water: 'water',
    cheat: 'cheat',
    workout: 'workout',
  }
  return map[expr] ?? 'normal'
}

export function characterMessageToLine(msg: CharacterMessage): ZaiJianLine {
  return {
    text: msg.text,
    subtext: msg.subtext,
    expression: mapExpression(msg.expression),
  }
}

/** 穩定選句 — 同一天同一 moment 顯示同一句 */
export function pickZaiJianLine(moment: ZaiJianMoment, salt = ''): ZaiJianLine {
  const category = MOMENT_CATEGORY[moment]
  const msg = pickCharacterMessage(category, `${moment}:${salt}`)
  return characterMessageToLine(msg)
}

/** 骰子重骰語氣升級 — 無限次，依累計次數升級 */
export function pickDiceLine(rollCount: number): ZaiJianLine {
  const count = Math.max(1, rollCount)
  return characterMessageToLine(pickDiceRerollMessage(count))
}

export const zaijian = {
  decideButton: '換一個同熱量的',
  nearby: '附近 3000 公尺',
  rollsRemaining: (_n: number) => '',
  rollsExhausted: '',
  mealOk: '這餐可以',
  todayMission: '今天做到這裡',
  reroll: '換一個同熱量的',
  favorite: '記起來了',
  navigate: '帶你去',
  goalDistance: (kg: number) => `還差 ${kg.toFixed(1)} kg`,
  goalWeek: (n: number) => `第 ${n} 週`,
  saving: '記著…',
  generating: '我在排本週。等一下。',
} as const
