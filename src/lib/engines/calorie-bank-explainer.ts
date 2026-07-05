import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import { isRecoveryActive } from '@/lib/engines/calorie-bank-engine'

export interface CalorieBankExplainer {
  intro: string
  reasonTitle: string
  reasonBody: string
  statusLines: { label: string; value: string }[]
}

export function buildCalorieBankExplainer(bank: CalorieBankRow): CalorieBankExplainer {
  const normal = bank.daily_target_kcal
  const adjusted = bank.internal_target_kcal
  const diff = adjusted - normal
  const recovery = isRecoveryActive(bank)

  const intro =
    '吃多了或吃少了，都不用重來。熱量銀行會把差額慢慢分散到接下來幾天，自動微調每日目標——不用補償性節食，也不製造罪惡感。'

  let reasonBody = '今天的目標已依你最近的飲食節奏微調。'
  if (diff > 0) {
    reasonBody = `昨天吃得比目標少約 ${Math.abs(diff).toLocaleString()} kcal，所以今天目標略為提高，幫你把熱量溫和補回來。`
  } else if (diff < 0 && recovery) {
    reasonBody = `先前吃得比目標多，銀行裡還有約 ${bank.recovery_balance_kcal.toLocaleString()} kcal 待平衡，所以今天目標略為降低。`
  } else if (recovery) {
    reasonBody = `先前吃得比目標多，熱量銀行正在幫你分散平衡。今天照常記錄就好。`
  }

  const statusLines: { label: string; value: string }[] = [
    { label: '原計畫目標', value: `${normal.toLocaleString()} kcal` },
    { label: '今日目標', value: `${adjusted.toLocaleString()} kcal` },
  ]
  if (recovery) {
    statusLines.push(
      { label: '待平衡熱量', value: `${bank.recovery_balance_kcal.toLocaleString()} kcal` },
      { label: '預計還需', value: `約 ${bank.spread_days_remaining} 天` }
    )
  }

  return {
    intro,
    reasonTitle: '為什麼今天啟用',
    reasonBody,
    statusLines,
  }
}
