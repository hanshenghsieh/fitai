import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import { isRecoveryActive } from '@/lib/engines/calorie-bank-engine'
import type { DailyExcessDriver } from '@/lib/engines/calorie-bank-engine'

export interface CalorieBankExplainer {
  intro: string
  reasonTitle: string
  reasonBody: string
  statusLines: { label: string; value: string }[]
}

const DRIVER_LABEL: Record<Exclude<DailyExcessDriver, null>, string> = {
  kcal: '總熱量',
  protein: '蛋白質',
  fat: '脂肪',
  carbs: '碳水',
}

export function buildCalorieBankExplainer(
  bank: CalorieBankRow,
  excessDriver: DailyExcessDriver = null
): CalorieBankExplainer {
  const normal = bank.daily_target_kcal
  const adjusted = bank.internal_target_kcal
  const diff = adjusted - normal
  const recovery = isRecoveryActive(bank)

  const intro =
    '熱量、蛋白質、脂肪、碳水任一項超過今日計畫，BetterBit 會啟用熱量銀行，把差額分散到接下來幾天——刪除餐點、數值回到計畫內，當天觸發的銀行會自動撤銷。'

  let reasonBody = '今天的目標已依你最近的飲食節奏微調。'
  if (diff > 0) {
    reasonBody = `昨天吃得比目標少約 ${Math.abs(diff).toLocaleString()} kcal，所以今天目標略為提高，幫你把熱量溫和補回來。`
  } else if (diff < 0 && recovery) {
    reasonBody = `先前超過計畫，銀行裡還有約 ${bank.recovery_balance_kcal.toLocaleString()} kcal 待平衡，所以今天目標略為降低。`
  } else if (recovery && excessDriver) {
    reasonBody = `今日${DRIVER_LABEL[excessDriver]}已超過計畫，熱量銀行正在幫你分散平衡。`
  } else if (recovery) {
    reasonBody = '先前超過今日計畫，熱量銀行正在幫你分散平衡。'
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
