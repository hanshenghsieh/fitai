/** D3 勝利 — 情緒進步，不是體重 */

import { differenceInDays } from 'date-fns'
import type { ZaiJianLine } from '@/lib/copy/zaijian'

export interface D3VictoryContext {
  profileCreatedAt: string
  mealsCompletedToday: number
  totalMealsToday?: number
  hadDecisionToday?: boolean
}

export function daysSinceSignup(profileCreatedAt: string): number {
  return differenceInDays(new Date(), new Date(profileCreatedAt)) + 1
}

export function getD3VictoryLine(ctx: D3VictoryContext): ZaiJianLine | null {
  const day = daysSinceSignup(ctx.profileCreatedAt)
  if (day > 3 || day < 1) return null

  if (day === 1) {
    return {
      text: '第一天不用完美。',
      expression: 'normal',
      subtext: '今天只要少想一次「要吃什麼」，你就贏了。',
    }
  }

  if (day === 2) {
    if (ctx.mealsCompletedToday >= 1) {
      return {
        text: '你昨天有少做一個決定。',
        expression: 'proud',
        subtext: '還沒瘦沒關係。你比較不累，這才是重點。',
      }
    }
    return {
      text: '還在就好。',
      expression: 'normal',
      subtext: '不用每天都有進度。打開了，就算今天有照顧自己。',
    }
  }

  // day 3
  return {
    text: '三天了。體重還沒變？正常。',
    expression: 'normal',
    subtext: '你有沒有比較不用自己想？有，就是進步。',
  }
}
