import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import { isRecoveryActive } from '@/lib/engines/calorie-bank-engine'
import type { ZaiJianLine } from '@/lib/copy/zaijian'

/** BetterBit recovery copy — no guilt, no debt language. */
export function getRecoveryPostureLine(
  bank: CalorieBankRow | null | undefined
): ZaiJianLine | null {
  if (!bank || !isRecoveryActive(bank)) return null

  if (bank.delta_kcal > 300) {
    return {
      text: '今天想怎麼吃都可以。',
      expression: 'normal',
      subtext: '接下來幾天，相信我。我們慢慢平衡回來。',
    }
  }

  return {
    text: '不用重來。',
    expression: 'normal',
    subtext: '我會慢慢幫你接回來。今天照常就好。',
  }
}

export function getRecoverySpreadHint(spreadDaysRemaining: number): string {
  if (spreadDaysRemaining <= 0) return ''
  return `接下來 ${spreadDaysRemaining} 天，我會慢慢幫你平衡回來。`
}
